from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import random
import json
from pydantic import BaseModel
import uvicorn

# FastAPI app initialization
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class AnswerOption(BaseModel):
    text: str
    is_correct: bool


class AnswerSubmission(BaseModel):
    session_id: str
    selected_answers: list[str]


class MoveQuestionRequest(BaseModel):
    session_id: str
    question_index: int


class SessionResetRequest(BaseModel):
    session_id: str


class QuizSettings(BaseModel):
    repeat_on_mistake: bool
    shuffle_answers: bool
    randomise_order: bool
    question_count_multiplier: int


# Global storage
quiz_sessions = {}


# Utility functions
def check_answers(selected_answers: list[str], correct_answers: list[str]) -> bool:
    return set(selected_answers) == set(correct_answers)


def get_correct_answers(session_id: str) -> list[str]:
    session = quiz_sessions.get(session_id)
    if not session:
        return []

    df = session["data"]
    question_index = session["current_question_index"]
    return [
        ans["text"] for ans in df.loc[question_index]["answer"] if ans["is_correct"]
    ]


def update_stats(session_id: str, is_correct: bool) -> None:
    session = quiz_sessions.get(session_id)
    if not session:
        return

    session["current_question_index"] += 1

    if is_correct:
        session["correct_count"] += 1
    else:
        session["incorrect_count"] += 1


def validate_session(session_id: str):
    session = quiz_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    return session


# API endpoints
@app.get("/", include_in_schema=False)  # Hide from OpenAPI docs
async def root():
    return {"status": "ok"}


@app.post("/upload-csv-with-settings/")
async def upload_csv_with_settings(
    files: list[UploadFile] = File(...), settings: str = Form(...)
):
    print("Received upload request:")
    print(f"Number of files: {len(files)}")
    print(f"File names: {[file.filename for file in files]}")
    print(f"Settings: {settings}")

    try:
        quiz_settings = QuizSettings.parse_raw(settings)
        print(f"Parsed settings: {quiz_settings}")
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return JSONResponse(
            {"error": f"Invalid JSON in settings: {str(e)}"}, status_code=400
        )

    combined_df = pd.DataFrame()
    for file in files:
        try:
            print(f"Processing file: {file.filename}")
            contents = await file.read()

            # Try pandas first - it's generally better at handling quoted CSV
            try:
                df = pd.read_csv(
                    io.BytesIO(contents),
                    dtype=str,  # Keep everything as strings initially
                    keep_default_na=False,  # Don't convert to NaN
                )
                print("Pandas parsing successful!")
                print(f"File columns: {df.columns.tolist()}")
                print(f"DataFrame shape: {df.shape}")

                if len(df.columns) != 2:
                    raise ValueError(f"Expected 2 columns, got {len(df.columns)}")

                # Check if data looks correct (no fragments)
                sample_answer = df.iloc[0].iloc[1] if len(df) > 0 else ""
                if not sample_answer.strip().startswith(
                    "["
                ) or not sample_answer.strip().endswith("]"):
                    print(
                        "Data appears corrupted in pandas, falling back to manual parsing"
                    )
                    raise ValueError("Data corruption detected")

            except Exception as pandas_error:
                print(f"Pandas parsing failed: {pandas_error}")
                print("Trying manual parsing...")

                # Fallback to manual parsing with better regex handling
                import re

                contents_str = contents.decode("utf-8")
                lines = contents_str.strip().split("\n")

                # Parse header
                header_line = lines[0]
                header = [col.strip() for col in header_line.split(",")]

                if len(header) != 2:
                    raise ValueError(
                        f"Header should have 2 columns, found {len(header)}"
                    )

                # Parse data with regex to handle quoted fields
                data_rows = []
                csv_pattern = r'"([^"]*(?:""[^"]*)*)","(\[.*\])"'

                for i, line in enumerate(lines[1:], 1):
                    match = re.match(csv_pattern, line.strip())
                    if match:
                        question = match.group(1).replace(
                            '""', '"'
                        )  # Handle escaped quotes
                        answer = match.group(2)
                        data_rows.append([question, answer])
                    else:
                        print(f"Warning: Could not parse line {i}: {line[:100]}...")

                if not data_rows:
                    raise ValueError("No valid data rows found with manual parsing")

                # Create DataFrame
                df = pd.DataFrame(data_rows, columns=header)
                print("Manual parsing successful!")
                print(f"File columns: {df.columns.tolist()}")
                print(f"DataFrame shape: {df.shape}")

            print(f"Sample question: {df.iloc[0].iloc[0] if len(df) > 0 else 'N/A'}")
            print(
                f"Sample answer preview: {df.iloc[0].iloc[1][:50] if len(df) > 0 else 'N/A'}..."
            )

            # Check for both capitalized and lowercase column names
            columns = [col.lower() for col in df.columns]
            if "question" not in columns or "answer" not in columns:
                return JSONResponse(
                    {
                        "error": f"CSV file {file.filename} must have 'Question' and 'Answer' columns."
                    },
                    status_code=400,
                )

            # Normalize column names to lowercase
            df.columns = df.columns.str.lower()

        except Exception as e:
            print(f"Error processing file {file.filename}: {str(e)}")
            return JSONResponse(
                {"error": f"Error processing {file.filename}: {str(e)}"},
                status_code=400,
            )

        # Parse JSON answers with better error handling
        def safe_json_parse(x):
            if not isinstance(x, str):
                return x
            if not x.strip():
                return []
            try:
                # Clean up the JSON string
                cleaned = x.strip()

                # Handle escaped quotes from CSV parsing
                if '\\"' in cleaned:
                    cleaned = cleaned.replace('\\"', '"')

                # Remove any extra quotes at the beginning and end
                if cleaned.startswith('"') and cleaned.endswith('"'):
                    cleaned = cleaned[1:-1]

                # Try to parse the JSON
                parsed = json.loads(cleaned)

                # Ensure we have a list of dictionaries
                if not isinstance(parsed, list):
                    print(
                        f"Warning: Expected list but got {type(parsed)} for value: {repr(x[:50])}"
                    )
                    return []

                # Validate each item is a dictionary with required keys
                valid_answers = []
                for item in parsed:
                    if (
                        isinstance(item, dict)
                        and "text" in item
                        and "is_correct" in item
                    ):
                        valid_answers.append(item)
                    else:
                        print(
                            f"Warning: Invalid answer format - missing 'text' or 'is_correct': {item}"
                        )

                if not valid_answers:
                    print(f"Warning: No valid answer options found in: {repr(x[:50])}")
                    return []

                return valid_answers

            except json.JSONDecodeError as e:
                print(f"JSON parsing error for value: {repr(x[:100])}")
                print(f"Error: {e}")
                # Try one more time with additional cleaning
                try:
                    # More aggressive cleaning
                    cleaned = x.strip()
                    if cleaned.startswith('"') and cleaned.endswith('"'):
                        cleaned = cleaned[1:-1]
                    cleaned = cleaned.replace('\\"', '"')
                    cleaned = cleaned.replace("\\\\", "\\")

                    parsed = json.loads(cleaned)
                    if isinstance(parsed, list):
                        return parsed
                except Exception:
                    pass
                return []

        print("Parsing JSON answers...")
        df["answer"] = df["answer"].apply(safe_json_parse)

        # Filter out rows where JSON parsing failed (empty lists)
        original_count = len(df)
        df = df[df["answer"].apply(lambda x: len(x) > 0)]
        if len(df) < original_count:
            print(
                f"Warning: Filtered out {original_count - len(df)} rows due to JSON parsing errors"
            )

        # Validate that we have valid answer structures
        print(f"Sample parsed answer: {df.iloc[0]['answer'] if len(df) > 0 else 'N/A'}")

        combined_df = pd.concat([combined_df, df], ignore_index=True)

    combined_df = pd.concat(
        [combined_df] * quiz_settings.question_count_multiplier, ignore_index=True
    )

    if quiz_settings.randomise_order:
        combined_df = combined_df.sample(frac=1).reset_index(drop=True)

    session_id = str(random.randint(1000, 9999))

    quiz_sessions[session_id] = {
        "data": combined_df,
        "original_data": combined_df.copy(),
        "current_question_index": 0,
        "correct_count": 0,
        "incorrect_count": 0,
        "settings": quiz_settings.dict(),
    }

    return {"session_id": session_id, "message": "Quiz session started!"}


@app.get("/quiz-settings/")
async def get_quiz_settings(session_id: str):
    session = quiz_sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    return session["settings"]


@app.get("/next-question/")
async def get_next_question(session_id: str):
    session = quiz_sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    df = session["data"]
    question_index = session["current_question_index"]

    if session["correct_count"] >= df.shape[0]:
        return {"message": "Quiz complete!", "total_questions": len(df)}

    question = df.loc[question_index]["question"]
    possible_answers = [ans["text"] for ans in df.loc[question_index]["answer"]]
    if session["settings"]["shuffle_answers"]:
        random.shuffle(possible_answers)
    multiple_choice = (
        len([ans for ans in df.loc[question_index]["answer"] if ans["is_correct"]]) > 1
    )

    return {
        "question": question,
        "options": possible_answers,
        "question_index": question_index,
        "multiple_choice": multiple_choice,
    }


@app.post("/submit-answer/")
async def submit_answer(submission: AnswerSubmission):
    if submission.session_id not in quiz_sessions:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    correct_answers = get_correct_answers(submission.session_id)
    is_correct = check_answers(submission.selected_answers, correct_answers)
    update_stats(submission.session_id, is_correct)
    return {
        "result": "Correct" if is_correct else "Incorrect",
        "correct_answers": correct_answers,
    }


@app.get("/quiz-stats/")
async def get_quiz_stats(session_id: str):
    session = quiz_sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    total_questions = len(session["data"])
    correct_count = session["correct_count"]
    incorrect_count = session["incorrect_count"]

    return {
        "total_questions": total_questions,
        "correct_answers": correct_count,
        "incorrect_answers": incorrect_count,
    }


@app.post("/move-question-to-bottom/")
async def move_question_to_bottom(request: MoveQuestionRequest):
    session = validate_session(request.session_id)
    df = session["data"]

    if request.question_index < 0 or request.question_index > df.index.max():
        raise HTTPException(status_code=400, detail="Invalid question index.")

    question = df.loc[request.question_index]

    if request.question_index < df.index.max():
        df = df.drop(request.question_index)
        df.loc[df.index.max() + 1] = question
    else:
        session["current_question_index"] = request.question_index

    session["data"] = df
    return {"message": "Question moved to the bottom successfully."}


@app.post("/reset-session/")
async def reset_session(session_reset_request: SessionResetRequest):
    session = quiz_sessions.get(session_reset_request.session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    session["current_question_index"] = 0
    session["correct_count"] = 0
    session["incorrect_count"] = 0
    session["data"] = session["original_data"].copy()

    return {"message": "Session reset successfully."}


# Application startup
if __name__ == "__main__":
    print("Starting server on 0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
