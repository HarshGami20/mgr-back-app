// utils/errorHandler.ts
import { Response } from "express";

interface ErrorResponse {
  statusCode: number;
  message: string;
}

export const handleError = (res: Response, error: unknown): void => {
  // Default to internal server error
  const response: ErrorResponse = {
    statusCode: 500,
    message: "An unknown error occurred",
  };

  if (error instanceof Error) {
    response.message = error.message;
  }

  // You can customize status codes here if needed based on the error type
  if (error instanceof Error && error.message === "Not found") {
    response.statusCode = 404;
  }

  res.status(response.statusCode).json({ message: response.message });
};
