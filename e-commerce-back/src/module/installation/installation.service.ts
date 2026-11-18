/** Installation-request business logic.
 *
 * Installation is a separate workflow from payment, order fulfillment, and
 * shipping. The only coupling is that a request points at the order it belongs
 * to (and the order keeps an `installationRequested` flag for convenience).
 */
import { Request, Response } from "express";

import { HttpError } from "../../common/utils/httpError.js";
import {
  INSTALLATION_STATUSES,
  InstallationStatus,
  installationRequestModel,
} from "../../database/model/installation.model.js";
import { orderModel } from "../../database/model/order.model.js";

const CANCELLABLE_STATUSES: InstallationStatus[] = ["PENDING", "UNDER_REVIEW", "SCHEDULED"];

const requireUserId = (req: Request): string => {
  const userId = req.user?._id;
  if (!userId) {
    throw new HttpError(401, "Unauthorized");
  }
  return userId;
};

const isAdmin = (req: Request): boolean => req.bearer === "admin" || req.bearer === "superAdmin";

/** Creates an installation request for one of the caller's own orders. */
export const createInstallationRequest = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const { orderId, contactName, phone, address, preferredDate, notes } = req.body;

  const order = await orderModel.findOne({ _id: orderId, userId });
  if (!order) {
    throw new HttpError(404, "Order not found");
  }
  if (order.orderStatus === "cancelled") {
    throw new HttpError(400, "Installation cannot be requested for a cancelled order");
  }

  const existing = await installationRequestModel.findOne({ orderId });
  if (existing) {
    throw new HttpError(409, "An installation request already exists for this order");
  }

  const request = await installationRequestModel.create({
    orderId: order._id,
    userId,
    contactName,
    phone,
    address,
    preferredDate: preferredDate ?? null,
    notes: notes ?? null,
  });

  order.installationRequested = true;
  order.installationRequestId = request._id;
  await order.save();

  res.status(201).json({ message: "Installation request created", data: request });
};

/** Lists the caller's installation requests. */
export const getMyInstallationRequests = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const requests = await installationRequestModel
    .find({ userId })
    .sort({ createdAt: -1 })
    .populate({ path: "orderId", select: "orderStatus paymentStatus totalAmount" });

  res.status(200).json({ message: "Installation requests", data: requests });
};

/** Admin listing with optional status filter and pagination. */
export const getAllInstallationRequests = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter: Record<string, unknown> = {};

  if (typeof req.query.status === "string" && req.query.status) {
    if (!INSTALLATION_STATUSES.includes(req.query.status as InstallationStatus)) {
      throw new HttpError(400, "Invalid installation status");
    }
    filter.status = req.query.status;
  }

  const [requests, total] = await Promise.all([
    installationRequestModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "orderId", select: "orderStatus paymentStatus totalAmount" })
      .populate({ path: "userId", select: "name email" }),
    installationRequestModel.countDocuments(filter),
  ]);

  res.status(200).json({
    message: "Installation requests",
    data: { requests, total, page, limit },
  });
};

/** Returns one request when the caller owns it or is an admin. */
export const getInstallationRequestById = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const request = await installationRequestModel
    .findById(req.params.id)
    .populate({ path: "orderId", select: "orderStatus paymentStatus totalAmount" });

  if (!request) {
    throw new HttpError(404, "Installation request not found");
  }
  if (String(request.userId) !== userId && !isAdmin(req)) {
    // Do not reveal that another user's request exists.
    throw new HttpError(404, "Installation request not found");
  }

  res.status(200).json({ message: "Installation request", data: request });
};

/** Admin-only workflow update (status, schedule, internal notes). */
export const updateInstallationStatus = async (req: Request, res: Response): Promise<void> => {
  const request = await installationRequestModel.findById(req.params.id);
  if (!request) {
    throw new HttpError(404, "Installation request not found");
  }

  const { status, scheduledAt, adminNotes } = req.body;

  if (status !== undefined) {
    request.status = status;
  }
  if (scheduledAt !== undefined) {
    request.scheduledAt = scheduledAt;
  }
  if (adminNotes !== undefined) {
    request.adminNotes = adminNotes;
  }

  if (request.status === "SCHEDULED" && !request.scheduledAt) {
    throw new HttpError(400, "scheduledAt is required when status is SCHEDULED");
  }

  await request.save();

  if (request.status === "CANCELLED") {
    await orderModel.findByIdAndUpdate(request.orderId, {
      installationRequested: false,
    });
  }

  res.status(200).json({ message: "Installation request updated", data: request });
};

/** Customer cancellation, allowed while the request has not started. */
export const cancelInstallationRequest = async (req: Request, res: Response): Promise<void> => {
  const userId = requireUserId(req);
  const request = await installationRequestModel.findOne({
    _id: req.params.id,
    userId,
  });
  if (!request) {
    throw new HttpError(404, "Installation request not found");
  }

  if (!CANCELLABLE_STATUSES.includes(request.status)) {
    throw new HttpError(400, `Cannot cancel a request with status ${request.status}`);
  }

  request.status = "CANCELLED";
  await request.save();

  await orderModel.findByIdAndUpdate(request.orderId, {
    installationRequested: false,
  });

  res.status(200).json({ message: "Installation request cancelled", data: request });
};
