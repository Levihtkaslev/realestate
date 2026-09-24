import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { Prisma } from "../generated/prisma/client";
import { INVALID_TYPE_MESSAGE } from "../utils/upload";



//================================================================================== 404 NOT FOUND ==========================================================================

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: "route not found: " + req.method + " " + req.originalUrl });
}



//================================================================================== ERROR HANDLER ==========================================================================

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {

  //  body is not valid JSON, e.g.  { "name": "Ravi",  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "invalid JSON in request body" });
  }

  //  upload errors: file too big, too many files ...
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  //  wrong file type (from our fileFilter)
  if (err.message === INVALID_TYPE_MESSAGE) {
    return res.status(400).json({ message: err.message });
  }

  // 4. database errors we understand
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // unique rule broken (e.g. same enquiry sent twice at the same moment)
      return res.status(409).json({ message: "already exists" });
    }
    if (err.code === "P2025") {
      // record to update / delete was not found (e.g. deleted by someone else just before)
      return res.status(404).json({ message: "record not found" });
    }
    if (err.code === "P2003") {
      // linked record problem (e.g. delete blocked by onDelete: Restrict)
      return res.status(409).json({ message: "cannot complete: this record is linked to other data" });
    }
  }

  // 5. anything else = a bug on our side.
  //    log the full error for us, but never send details (stack, SQL) to the user
  console.error(err);
  res.status(500).json({ message: "something went wrong" });
}
