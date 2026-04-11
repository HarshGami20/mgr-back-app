import { Request, Response, NextFunction } from "express";

const MAX_BODY_LOG = 12_000;

/** Set `LOG_HTTP=0` to disable request/response logging. */
export function apiHttpLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.LOG_HTTP === "0") {
    next();
    return;
  }

  const start = Date.now();
  const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const reqLine = {
    rid,
    method: req.method,
    url: req.originalUrl || req.url,
    query: req.query,
    body: redactDeep(req.body),
  };
  console.log(`[HTTP] ← ${JSON.stringify(reqLine)}`);

  let responseLogged = false;
  const origJson = res.json.bind(res);
  res.json = function logJson(body: unknown) {
    responseLogged = true;
    const ms = Date.now() - start;
    try {
      const out =
        typeof body === "string" ? body : JSON.stringify(redactDeep(body));
      console.log(`[HTTP] → ${rid} status=${res.statusCode} ${ms}ms body=${truncate(out)}`);
    } catch {
      console.log(`[HTTP] → ${rid} status=${res.statusCode} ${ms}ms body=[unserializable]`);
    }
    return origJson(body);
  };

  res.on("finish", () => {
    if (!responseLogged) {
      const ms = Date.now() - start;
      console.log(`[HTTP] → ${rid} status=${res.statusCode} ${ms}ms (non-JSON response)`);
    }
  });

  next();
}

function truncate(s: string): string {
  if (s.length <= MAX_BODY_LOG) return s;
  return `${s.slice(0, MAX_BODY_LOG)}…(+${s.length - MAX_BODY_LOG} chars)`;
}

function redactDeep(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "string") return val.length > 500 ? `${val.slice(0, 500)}…` : val;
  if (typeof val !== "object") return val;
  if (Array.isArray(val)) return val.map(redactDeep);
  const o = val as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const lk = k.toLowerCase();
    if (
      lk.includes("password") ||
      lk === "token" ||
      lk === "authorization" ||
      lk === "secret"
    ) {
      out[k] = "[redacted]";
    } else {
      out[k] = redactDeep(v);
    }
  }
  return out;
}
