import type { Request, Response } from "express";
import type { AuthConfig } from "../config/auth.config";
import type { DriveRepository } from "../db/drive.repository";
import { sessionContext } from "../middleware/session.middleware";
import { OAuthFailure } from "../services/google.service";
import type { GoogleProvider } from "../services/google.service";
import type { TokenEncryption } from "../services/token-encryption.service";
import { hash, isToken, randomToken } from "../utils/auth.util";
import { HttpError } from "../utils/http-error.util";
import type { DriveAccess } from "../services/drive-access.service";
import { isUuid } from "../utils/validation.util";

export const DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.metadata.readonly";

export function createDriveController(
  repository: DriveRepository,
  google: GoogleProvider,
  encryption: TokenEncryption,
  config: AuthConfig,
  access: DriveAccess,
) {
  const cookieName = config.production
    ? "__Host-drivepool_drive_oauth"
    : "drivepool_drive_oauth";
  const cookie = {
    httpOnly: true,
    secure: config.production,
    sameSite: "lax" as const,
    path: "/",
  };
  const redirect = (res: Response, outcome: string) => {
    const target = new URL("/", config.appOrigin);
    target.searchParams.set("drive", outcome);
    res.redirect(303, target.toString());
  };
  async function connect(req: Request, res: Response) {
    if (!config.clientId || !config.clientSecret)
      throw new HttpError(
        503,
        "auth_not_configured",
        "Google sign-in is not configured.",
      );
    const session = sessionContext(res);
    let expectedSubject: string | null = null;
    if (req.params.id) {
      if (!isUuid(req.params.id))
        throw new HttpError(404, "account_not_found", "Account not found.");
      const account = await repository.get(session.userId, req.params.id);
      if (!account || account.status === "disconnecting")
        throw new HttpError(404, "account_not_found", "Account not found.");
      expectedSubject = account.googleSubject;
    }
    const state = randomToken(),
      browser = randomToken(),
      nonce = randomToken(),
      verifier = randomToken();
    await repository.begin({
      stateHash: hash(state),
      browserHash: hash(browser),
      nonce,
      verifier,
      intent: "connect_drive",
      userId: session.userId,
      sessionHash: session.tokenHash,
      expectedSubject,
      expiresAt: new Date(Date.now() + 600_000),
    });
    res.cookie(cookieName, browser, { ...cookie, maxAge: 600_000 });
    res.json({
      authorizationUrl: google.authorizationUrl(state, nonce, verifier),
    });
  }
  async function callback(req: Request, res: Response) {
    res.clearCookie(cookieName, cookie);
    const browser: unknown = req.cookies?.[cookieName];
    const state = req.query.state;
    if (!isToken(browser) || !isToken(state)) {
      redirect(res, "invalid_state");
      return;
    }
    const session = sessionContext(res);
    const transaction = await repository.consume(
      hash(state),
      hash(browser),
      session.userId,
      session.tokenHash,
    );
    if (!transaction) {
      redirect(res, "invalid_state");
      return;
    }
    if (req.query.error !== undefined) {
      redirect(res, "consent_denied");
      return;
    }
    if (
      typeof req.query.code !== "string" ||
      !req.query.code ||
      req.query.code.length > 4096
    ) {
      redirect(res, "invalid_code");
      return;
    }
    try {
      const grant = await google.exchangeGrant(
        req.query.code,
        transaction.verifier,
        transaction.nonce,
      );
      if (
        transaction.expectedSubject &&
        transaction.expectedSubject !== grant.identity.subject
      ) {
        redirect(res, "wrong_account");
        return;
      }
      if (!grant.scopes.split(" ").includes(DRIVE_SCOPE)) {
        redirect(res, "missing_scope");
        return;
      }
      const existing = await repository.bySubject(grant.identity.subject);
      if (
        existing &&
        (existing.userId !== session.userId ||
          existing.status === "disconnecting")
      ) {
        redirect(res, "account_conflict");
        return;
      }
      const context = `${session.userId}:${grant.identity.subject}`;
      // A reconnect requires a fresh grant; an ordinary repeat can keep its valid token.
      const encryptedRefreshToken = grant.refreshToken
        ? await encryption.encrypt(grant.refreshToken, context)
        : existing?.status === "active"
          ? existing.encryptedRefreshToken
          : null;
      if (!encryptedRefreshToken) {
        redirect(res, "reconnect_required");
        return;
      }
      await repository.connect({
        userId: session.userId,
        googleSubject: grant.identity.subject,
        email: grant.identity.email,
        encryptedRefreshToken,
        scopes: grant.scopes,
      });
      redirect(res, "connected");
    } catch (error) {
      if (error instanceof OAuthFailure) {
        redirect(res, error.code);
        return;
      }
      if (error instanceof HttpError) {
        redirect(res, error.code);
        return;
      }
      throw error;
    }
  }
  async function list(_req: Request, res: Response) {
    const accounts = await repository.list(sessionContext(res).userId);
    res.json({
      accounts: accounts.map(({ id, email, status, createdAt }) => ({
        id,
        email,
        status,
        createdAt,
      })),
    });
  }
  async function disconnect(req: Request, res: Response) {
    if (!isUuid(req.params.id))
      throw new HttpError(404, "account_not_found", "Account not found.");
    const complete = await access.disconnect(
      sessionContext(res).userId,
      req.params.id,
    );
    if (complete) res.status(204).end();
    else
      res.status(202).json({
        status: "disconnecting",
        message:
          "Local access disabled. Google revocation is pending; credentials are retained for retries for up to 24 hours. You can also revoke access in Google Account settings.",
      });
  }
  return { connect, callback, list, disconnect };
}
