# Mergebox

Version `0.0.0` baseline with an Express backend and a Next.js frontend.

## Backend

```sh
cd backend
yarn install
yarn dev
```

Runs at http://localhost:8000. `GET /hello` logs the request and returns
`{"message":"Hello World!"}`.

## Frontend

```sh
cd frontend
npm install
npm run dev
```

Runs at http://localhost:3000. Uses TypeScript, App Router, Tailwind CSS, and ESLint.

## Checks

Run `yarn build` in `backend`. Run `npm run lint` and `npm run build` in `frontend`.
