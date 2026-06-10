# Pink Lifeline Backend - API Documentation

Base URL (Local): `http://localhost:5000`
Replace `<BASE_URL>` with your actual server URL (e.g., `http://localhost:5000`).

---

## 1. Doctor / User Registration (`/api/registration`)

### Register User/Doctor
- **Endpoint:** `POST /api/registration/register`
- **Description:** Registers a new user or doctor. Requires multipart/form-data for image upload.
- **Request Body (FormData):**
  - `type`: `1` (for doctor), `0` (for user)
  - `fullName`: `Dr. Jane Doe`
  - `email`: `janedoe@example.com`
  - `phoneNumber`: `+8801700000000`
  - `doctorRegistrationNumber`: `BMDC-12345` (if doctor)
  - `currentWorkplace`: `Dhaka Medical College` (if doctor)
  - `currentDesignation`: `Surgeon` (if doctor)
  - `aboutMe`: `Experienced in breast cancer surgery.`
  - `qualifications`: `[{"degree": "MBBS", "institute": "DMC"}]`
  - `photo`: `(File - JPG/PNG)`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/registration/register' \
--form 'type="1"' \
--form 'fullName="Dr. Jane Doe"' \
--form 'email="janedoe@example.com"' \
--form 'phoneNumber="+8801700000000"' \
--form 'doctorRegistrationNumber="BMDC-12345"' \
--form 'currentWorkplace="Dhaka Medical College"' \
--form 'currentDesignation="Surgeon"' \
--form 'aboutMe="Experienced in breast cancer surgery."' \
--form 'qualifications="[{\"degree\": \"MBBS\", \"institute\": \"DMC\"}]"' \
--form 'photo=@"/path/to/your/image.jpg"'
```

### Login User/Doctor
- **Endpoint:** `POST /api/registration/login`
- **Description:** Login a user by email.
- **Request Body (JSON):**
```json
{
  "email": "janedoe@example.com"
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/registration/login' \
--header 'Content-Type: application/json' \
--data '{
    "email": "janedoe@example.com"
}'
```

---

## 2. Period Tracking (`/api/period/v1`)

### Insert or Update Period Log
- **Endpoint:** `PATCH /api/period/v1/insert-period`
- **Description:** Adds or updates period data for a user.
- **Request Body (JSON):**
```json
{
  "userId": "USR-ABCDEF",
  "period": [
    {
      "date": "2023-10-01",
      "bleeding": { "flowLevel": 2 },
      "symptoms": ["cramps", "headache"],
      "spotting": false
    }
  ]
}
```
- **cURL:**
```bash
curl --request PATCH --location '<BASE_URL>/api/period/v1/insert-period' \
--header 'Content-Type: application/json' \
--data '{
  "userId": "USR-ABCDEF",
  "period": [
    {
      "date": "2023-10-01",
      "bleeding": { "flowLevel": 2 },
      "symptoms": ["cramps", "headache"],
      "spotting": false
    }
  ]
}'
```

### Get Period Info (Date Wise)
- **Endpoint:** `POST /api/period/v1/get-period-info-date-wise`
- **Description:** Fetch period logs for a specific user.
- **Request Body (JSON):**
```json
{
  "userId": "USR-ABCDEF"
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/period/v1/get-period-info-date-wise' \
--header 'Content-Type: application/json' \
--data '{
    "userId": "USR-ABCDEF"
}'
```

### Get Period Basic Insights
- **Endpoint:** `POST /api/period/v1/get-period-basics-insights`
- **Description:** Analyzes cycles and provides insights like duration and symptom frequency.
- **Request Body (JSON):**
```json
{
  "userId": "USR-ABCDEF"
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/period/v1/get-period-basics-insights' \
--header 'Content-Type: application/json' \
--data '{
    "userId": "USR-ABCDEF"
}'
```

### Add Daily Note
- **Endpoint:** `POST /api/period/v1/add-daily-notes/:userId`
- **Description:** Adds a daily note for a period log. Requires valid token/middleware `isUserExist`.
- **Request Body (JSON):**
```json
{
  "time": "10:00 AM",
  "date": "2023-10-05",
  "note": "Feeling exhausted today."
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/period/v1/add-daily-notes/USR-ABCDEF' \
--header 'Content-Type: application/json' \
--data '{
    "time": "10:00 AM",
    "date": "2023-10-05",
    "note": "Feeling exhausted today."
}'
```

---

## 3. Self Test (`/api/self-test/v1`)

### Steps

#### Add Self Test Step
- **Endpoint:** `POST /api/self-test/v1/add-step`
- **Description:** Creates a new step. Requires video upload.
- **Request Body (FormData):**
  - `stepNo`: `1`
  - `title`: `Visual Inspection`
  - `video`: `(File - MP4)`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/add-step' \
--form 'stepNo="1"' \
--form 'title="Visual Inspection"' \
--form 'video=@"/path/to/video.mp4"'
```

#### Update Step By ID
- **Endpoint:** `PUT /api/self-test/v1/update-step-by-id/:stepId`
- **Description:** Updates step title, serial, or video.
- **Request Body (FormData):**
  - `stepNo`: `2`
  - `title`: `Palpation Technique`
  - `video`: `(File - MP4, Optional)`
- **cURL:**
```bash
curl --request PUT --location '<BASE_URL>/api/self-test/v1/update-step-by-id/654a1b...' \
--form 'stepNo="2"' \
--form 'title="Palpation Technique"'
```

#### Get All Steps
- **Endpoint:** `GET /api/self-test/v1/get-all-steps`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/get-all-steps'
```

#### Delete Step By ID
- **Endpoint:** `DELETE /api/self-test/v1/delete-step-by-id/:stepId`
- **cURL:**
```bash
curl --request DELETE --location '<BASE_URL>/api/self-test/v1/delete-step-by-id/654a1b...'
```

#### Stream Video
- **Endpoint:** `GET /api/self-test/v1/video/:videoId`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/video/video_filename.mp4'
```

### Questions

#### Add Question
- **Endpoint:** `POST /api/self-test/v1/add-question`
- **Request Body (JSON):**
```json
{
  "title": "Do you notice any skin dimpling?",
  "stepNo": 1
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/add-question' \
--header 'Content-Type: application/json' \
--data '{
    "title": "Do you notice any skin dimpling?",
    "stepNo": 1
}'
```

#### Get Questions By Step No
- **Endpoint:** `GET /api/self-test/v1/get-questions/:stepNo`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/get-questions/1'
```

#### Get All Questions
- **Endpoint:** `GET /api/self-test/v1/get-all-questions`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/get-all-questions'
```

#### Update Question
- **Endpoint:** `PUT /api/self-test/v1/update-question/:questionId`
- **Request Body (JSON):**
```json
{
  "title": "Updated Question?",
  "stepNo": 2
}
```
- **cURL:**
```bash
curl --request PUT --location '<BASE_URL>/api/self-test/v1/update-question/654a1b...' \
--header 'Content-Type: application/json' \
--data '{
    "title": "Updated Question?",
    "stepNo": 2
}'
```

#### Delete Question
- **Endpoint:** `DELETE /api/self-test/v1/delete-question/:questionId`
- **cURL:**
```bash
curl --request DELETE --location '<BASE_URL>/api/self-test/v1/delete-question/654a1b...'
```

### Answers

#### Add Answer
- **Endpoint:** `POST /api/self-test/v1/add-answer`
- **Request Body (JSON):**
```json
{
  "title": "Yes, I notice some changes.",
  "questionId": "654a1b...",
  "score": 1
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/add-answer' \
--header 'Content-Type: application/json' \
--data '{
    "title": "Yes, I notice some changes.",
    "questionId": "654a1b...",
    "score": 1
}'
```

#### Get Answers By Question ID
- **Endpoint:** `GET /api/self-test/v1/get-answers/:questionId`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/get-answers/654a1b...'
```

#### Update Answer
- **Endpoint:** `PUT /api/self-test/v1/update-answer/:answerId`
- **Request Body (JSON):**
```json
{
  "title": "No changes.",
  "score": 0
}
```
- **cURL:**
```bash
curl --request PUT --location '<BASE_URL>/api/self-test/v1/update-answer/654a1b...' \
--header 'Content-Type: application/json' \
--data '{
    "title": "No changes.",
    "score": 0
}'
```

#### Delete Answer
- **Endpoint:** `DELETE /api/self-test/v1/delete-answer/:answerId`
- **cURL:**
```bash
curl --request DELETE --location '<BASE_URL>/api/self-test/v1/delete-answer/654a1b...'
```

#### Get All Answers
- **Endpoint:** `GET /api/self-test/v1/get-all-answers`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/get-all-answers'
```

#### Get All Questions and Answers Organized By Steps
- **Endpoint:** `GET /api/self-test/v1/get-all-question-by-steps`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/self-test/v1/get-all-question-by-steps'
```

---

## 4. Community (`/api/community/v1`)

### Create Post
- **Endpoint:** `POST /api/community/v1/create-post/:userId`
- **Description:** Creates a community post. Accepts optional image upload.
- **Request Body (FormData):**
  - `title`: `My Journey`
  - `description`: `Sharing my breast cancer recovery journey.`
  - `hashtags`: `#recovery #health`
  - `photo`: `(File - JPG/PNG)`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/community/v1/create-post/USR-ABCDEF' \
--form 'title="My Journey"' \
--form 'description="Sharing my breast cancer recovery journey."' \
--form 'hashtags="#recovery #health"' \
--form 'photo=@"/path/to/image.jpg"'
```

### Get All Posts
- **Endpoint:** `GET /api/community/v1/get-all-posts`
- **cURL:**
```bash
curl --location '<BASE_URL>/api/community/v1/get-all-posts'
```

### Post Upvote
- **Endpoint:** `POST /api/community/v1/post-upvote/:userId`
- **Description:** Upvotes a post or switches from downvote.
- **Request Body (JSON):**
```json
{
  "postId": "654a1b..."
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/community/v1/post-upvote/USR-ABCDEF' \
--header 'Content-Type: application/json' \
--data '{
    "postId": "654a1b..."
}'
```

### Post Downvote
- **Endpoint:** `POST /api/community/v1/post-downvote/:userId`
- **Description:** Downvotes a post or switches from upvote.
- **Request Body (JSON):**
```json
{
  "postId": "654a1b..."
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/community/v1/post-downvote/USR-ABCDEF' \
--header 'Content-Type: application/json' \
--data '{
    "postId": "654a1b..."
}'
```

### Post Comment
- **Endpoint:** `POST /api/community/v1/post-comment/:userId`
- **Description:** Comments on a post.
- **Request Body (JSON):**
```json
{
  "postId": "654a1b...",
  "text": "Thank you for sharing!"
}
```
- **cURL:**
```bash
curl --location '<BASE_URL>/api/community/v1/post-comment/USR-ABCDEF' \
--header 'Content-Type: application/json' \
--data '{
    "postId": "654a1b...",
    "text": "Thank you for sharing!"
}'
```
