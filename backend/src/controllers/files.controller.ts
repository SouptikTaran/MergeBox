import type { Request, Response } from "express";
import { sessionContext } from "../middleware/session.middleware";
import type {
  BrowseOptions,
  FileBrowser,
} from "../services/file-browser.service";
import { HttpError } from "../utils/http-error.util";
import { isUuid } from "../utils/validation.util";

export function createFilesController(browser: FileBrowser) {
  return {
    async list(req: Request, res: Response) {
      const { accountId, pageToken } = req.query;
      const sort = req.query.sort ?? "name",
        direction = req.query.direction ?? "asc";
      const pageSize =
        req.query.pageSize === undefined
          ? 50
          : typeof req.query.pageSize === "string" &&
              /^\d+$/.test(req.query.pageSize)
            ? Number(req.query.pageSize)
            : NaN;
      if (
        typeof sort !== "string" ||
        !["name", "size", "modifiedTime", "mimeType"].includes(sort) ||
        (direction !== "asc" && direction !== "desc") ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 200 ||
        (accountId !== undefined && !isUuid(accountId)) ||
        (pageToken !== undefined &&
          (typeof pageToken !== "string" || pageToken.length > 100))
      )
        throw new HttpError(
          400,
          "invalid_query",
          "Invalid file-list filter, sort, page size, or cursor.",
        );
      res.json(
        await browser.list(sessionContext(res).userId, {
          accountId: accountId as string | undefined,
          pageToken: pageToken as string | undefined,
          sort: sort as BrowseOptions["sort"],
          direction,
          pageSize,
        }),
      );
    },
  };
}
