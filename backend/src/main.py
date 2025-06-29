from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import random
import json
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()


@app.get("/")
async def root():
    return {"status": "ok"}


app.add_middleware(
    CORSMiddleware,
    # Allow specific origins - both container and host URLs
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# Dictionary to store session data
quiz_sessions = {}


@app.post("/upload-csv-with-settings/")
async def upload_csv_with_settings(files: list[UploadFile] = File(...), settings: str = Form(...)):
    print("Received upload request:")
    print(f"Number of files: {len(files)}")
    print(f"File names: {[file.filename for file in files]}")
    print(f"Settings: {settings}")
    
    # Parse JSON string to QuizSettings
    try:
        quiz_settings = QuizSettings.parse_raw(settings)
        print(f"Parsed settings: {quiz_settings}")
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return JSONResponse({"error": f"Invalid JSON in settings: {str(e)}"}, status_code=400)

    combined_df = pd.DataFrame()
    for file in files:
        try:
            print(f"Processing file: {file.filename}")
            contents = await file.read()
            df = pd.read_csv(io.BytesIO(contents))
            print(f"File columns: {df.columns.tolist()}")

            # Ensure required columns are present
            if "question" not in df.columns or "answer" not in df.columns:
                return JSONResponse({"error": f"CSV file {file.filename} must have 'question' and 'answer' columns."}, status_code=400)
        except Exception as e:
            print(f"Error processing file {file.filename}: {str(e)}")
            return JSONResponse({"error": f"Error processing {file.filename}: {str(e)}"}, status_code=400)

        # Parse answer column if it's in JSON format
        df["answer"] = df["answer"].apply(
            lambda x: json.loads(x.replace("\\\\", "\\\\\\")) if isinstance(x, str) else x
        )

        # Combine data into a single dataframe
        combined_df = pd.concat([combined_df, df], ignore_index=True)

    # Apply question count multiplier
    combined_df = pd.concat([combined_df] * quiz_settings.question_count_multiplier, ignore_index=True)

    # Randomize order if specified
    if quiz_settings.randomise_order:
        combined_df = combined_df.sample(frac=1).reset_index(drop=True)

    # Generate a unique session ID
    session_id = str(random.randint(1000, 9999))

    # Store the session data
    quiz_sessions[session_id] = {
        "data": combined_df,
        "original_data": combined_df.copy(),
        "current_question_index": 0,
        "correct_count": 0,
        "incorrect_count": 0,
        "settings": quiz_settings.dict(),
    }

    # Return the session ID to the client
    return {"session_id": session_id, "message": "Quiz session started!"}


@app.get("/quiz-settings/")
async def get_quiz_settings(session_id: str):
    session = quiz_sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    return session["settings"]


# Endpoint to get the next question
@app.get("/next-question/")
async def get_next_question(session_id: str):
    session = quiz_sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    df = session["data"]
    question_index = session["current_question_index"]

    # Check if there are more questions
    if session["correct_count"] >= df.shape[0]:
        return {"message": "Quiz complete!", "total_questions": len(df)}

    # Get the current question and possible answers (for display purposes)
    question = df.loc[question_index]["question"]
    possible_answers = [ans["text"] for ans in df.loc[question_index]["answer"]]
    if session["settings"]["shuffle_answers"]:
        random.shuffle(possible_answers)
    multiple_choice = len([ans for ans in df.loc[question_index]["answer"] if ans["is_correct"]]) > 1

    return {
        "question": question,
        "options": possible_answers,
        "question_index": question_index,
        "multiple_choice": multiple_choice,
    }


# Endpoint to submit an answer
@app.post("/submit-answer/")
async def submit_answer(submission: AnswerSubmission):
    if submission.session_id not in quiz_sessions:
        raise HTTPException(status_code=400, detail="Invalid session ID")

    correct_answers = get_correct_answers(submission.session_id)
    is_correct = check_answers(submission.selected_answers, correct_answers)
    update_stats(submission.session_id, is_correct)
    return {"result": "Correct" if is_correct else "Incorrect", "correct_answers": correct_answers}


def check_answers(selected_answers: list[str], correct_answers: list[str]) -> bool:
    return set(selected_answers) == set(correct_answers)


def get_correct_answers(session_id: str) -> list[str]:
    session = quiz_sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    df = session["data"]
    question_index = session["current_question_index"]
    return [ans["text"] for ans in df.loc[question_index]["answer"] if ans["is_correct"]]


def update_stats(session_id: str, is_correct: bool) -> int:
    session = quiz_sessions.get(session_id)
    if not session:
        return JSONResponse({"error": "Invalid session ID."}, status_code=400)

    session["current_question_index"] += 1

    if is_correct:
        session["correct_count"] += 1
    else:
        session["incorrect_count"] += 1


# Endpoint to get quiz statistics
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


# Endpoint to move a given question to the bottom of the DataFrame
@app.post("/move-question-to-bottom/")
async def move_question_to_bottom(request: MoveQuestionRequest):
    session = quiz_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=400, detail="Invalid session ID.")

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


# Endpoint to reset the session
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


# Add this to run directly with python main.py
if __name__ == "__main__":
    print("Starting server on 0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
