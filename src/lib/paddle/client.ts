import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { getPaddleApiKey, getPaddleEnv } from "@/lib/paddle/config";

let paddle: Paddle | null = null;

export function getPaddleServer(): Paddle {
  if (paddle) return paddle;

  const apiKey = getPaddleApiKey();
  if (!apiKey) {
    throw new Error("Falta PADDLE_API_KEY.");
  }

  paddle = new Paddle(apiKey, {
    environment:
      getPaddleEnv() === "production"
        ? Environment.production
        : Environment.sandbox,
  });

  return paddle;
}
