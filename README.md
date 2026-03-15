# Car Inspection AI

Upload vehicle photos and get AI-powered damage analysis. Built with a serverless event-driven architecture on AWS.

## Architecture

```
Frontend (Next.js) → API Gateway → Lambda → DynamoDB / S3 / SQS
```

- **Frontend** — Next.js, TypeScript, Tailwind CSS, Framer Motion
- **API** — API Gateway HTTP API routing to Lambda handlers
- **Storage** — S3 for photos, DynamoDB for metadata
- **Processing** — SQS queue triggers a Lambda worker for async AI analysis
- **Infra** — AWS CDK (TypeScript)

## How It Works

1. User creates an inspection
2. Backend returns a presigned S3 upload URL
3. User uploads photos directly to S3
4. Backend queues each photo for AI analysis via SQS
5. Worker Lambda analyzes the image and stores results in DynamoDB
6. Frontend polls for results and displays the inspection report

## Project Structure

```
car-inspection-ai/
  backend/       Lambda handlers and shared libs
  frontend/      Next.js app
  infra/         CDK stack (S3, DynamoDB, SQS, Lambda, API Gateway)
```

## Getting Started

### Prerequisites

- Node.js 20+
- AWS CLI configured
- AWS CDK CLI (`npm install -g aws-cdk`)

### Deploy Infrastructure

```bash
cd infra
npm install
npx cdk deploy
```

### Run Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local  # add your API Gateway URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/inspections` | Create a new inspection |
| `GET` | `/inspections/{id}` | Get inspection details |
| `POST` | `/inspections/{id}/photos` | Get presigned upload URL |
| `POST` | `/inspections/{id}/photos/{photoId}/complete` | Mark upload complete |
| `GET` | `/inspections/{id}/photos` | List photos |
| `POST` | `/inspections/{id}/photos/{photoId}/analyze` | Trigger AI analysis |
| `POST` | `/inspections/{id}/photos/{photoId}/retry` | Retry failed analysis |
| `GET` | `/inspections/{id}/report` | Get full inspection report |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS, Framer Motion |
| API | AWS API Gateway (HTTP API) |
| Compute | AWS Lambda (Node.js 20) |
| Database | AWS DynamoDB |
| Storage | AWS S3 |
| Queue | AWS SQS |
| Infra | AWS CDK |
