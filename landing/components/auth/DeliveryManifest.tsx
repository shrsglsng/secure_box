import React from "react";
import {
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  Plus,
} from "lucide-react";
import { ShippingLabelHeader } from "./ShippingLabelHeader";

export interface StoredUserData {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  pincode?: string;
  units?: number;
  orderStatus?: "pending" | "preparing" | "dispatched" | "delivered" | "approved" | "rejected";
  assignedDevices?: string[];
}

interface DeliveryManifestProps {
  currentUser: StoredUserData | null;
  onLogout: () => void;
  onStartOrder?: () => void;
}

export function DeliveryManifest({ currentUser, onLogout, onStartOrder }: DeliveryManifestProps) {
  const initials = (currentUser?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasOrder = Boolean(currentUser?.orderStatus);
  const unitCount =
    typeof currentUser?.units === "number"
      ? currentUser.units
      : currentUser?.assignedDevices?.length || 0;

  return (
    <div className="flex-1 flex items-center justify-center w-full h-full font-sans p-1 sm:p-2">
      <div className="bg-[#FAF9F5] border-2 border-[#3D2310]/35 p-4 sm:p-5 text-[#3D2310] w-[94%] md:w-[90%] h-[94%] flex flex-col justify-between mx-auto my-auto overflow-hidden no-scrollbar shadow-none">
        <ShippingLabelHeader
          title={hasOrder ? "Order Status" : "My Account"}
          subtitle={hasOrder ? "Order and delivery address" : "Account details"}
        />

        <div className="flex-1 flex flex-col justify-center py-2 space-y-3">
          {/* Customer Badge & Rubber Stamp */}
          <div className="flex items-center justify-between gap-3 bg-white p-3 border-2 border-[#3D2310]/20">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-11 h-11 bg-amber-500/15 border border-amber-600/30 flex items-center justify-center text-[#3D2310] font-black text-sm shrink-0 font-mono">
                {initials || "U"}
              </div>
              <div className="overflow-hidden">
                <span className="text-[9px] font-mono uppercase text-zinc-500 block font-bold">
                  {hasOrder ? "RECIPIENT" : "ACCOUNT"}
                </span>
                <h4 className="font-black text-sm text-[#3D2310] truncate">
                  {currentUser?.name || "Customer"}
                </h4>
                <div className="flex items-center gap-2 pt-0.5">
                  <p className="text-xs text-zinc-600 font-mono truncate font-semibold">
                    {currentUser?.phone ? `+91 ${currentUser.phone}` : currentUser?.email || "Verified"}
                  </p>
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-[#3D2310] font-mono text-[10px] font-black border border-amber-300 shrink-0">
                    {unitCount} {unitCount === 1 ? "UNIT" : "UNITS"}
                  </span>
                </div>
              </div>
            </div>

            {currentUser?.orderStatus === "delivered" ? (
              <div className="border-2 border-emerald-700 px-2.5 py-1 text-center font-mono rotate-[-3deg] bg-emerald-50 shrink-0">
                <span className="text-[8px] font-black text-emerald-800 tracking-wider block">STATUS</span>
                <span className="text-[11px] font-black text-emerald-700">DELIVERED</span>
              </div>
            ) : currentUser?.orderStatus === "dispatched" ? (
              <div className="border-2 border-purple-700 px-2.5 py-1 text-center font-mono rotate-[-3deg] bg-purple-50 shrink-0">
                <span className="text-[8px] font-black text-purple-800 tracking-wider block">STATUS</span>
                <span className="text-[11px] font-black text-purple-700">DISPATCHED</span>
              </div>
            ) : currentUser?.orderStatus === "preparing" || currentUser?.orderStatus === "approved" ? (
              <div className="border-2 border-blue-700 px-2.5 py-1 text-center font-mono rotate-[-3deg] bg-blue-50 shrink-0">
                <span className="text-[8px] font-black text-blue-800 tracking-wider block">STATUS</span>
                <span className="text-[11px] font-black text-blue-700">PREPARING</span>
              </div>
            ) : currentUser?.orderStatus === "rejected" ? (
              <div className="border-2 border-rose-700 px-2.5 py-1 text-center font-mono rotate-[-3deg] bg-rose-50 shrink-0">
                <span className="text-[8px] font-black text-rose-800 tracking-wider block">STATUS</span>
                <span className="text-[11px] font-black text-rose-700">REJECTED</span>
              </div>
            ) : currentUser?.orderStatus === "pending" ? (
              <div className="border-2 border-amber-700 px-2.5 py-1 text-center font-mono rotate-[-3deg] bg-amber-50 shrink-0">
                <span className="text-[8px] font-black text-amber-800 tracking-wider block">STATUS</span>
                <span className="text-[11px] font-black text-amber-700">PENDING</span>
              </div>
            ) : (
              <div className="border-2 border-emerald-700 px-2.5 py-1 text-center font-mono rotate-[-3deg] bg-emerald-50 shrink-0">
                <span className="text-[8px] font-black text-emerald-800 tracking-wider block">STATUS</span>
                <span className="text-[11px] font-black text-emerald-700">ACTIVE</span>
              </div>
            )}
          </div>

          {hasOrder ? (
            <>
              {/* Delivery Destination */}
              <div className="bg-white p-3 border-2 border-[#3D2310]/20 text-xs space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-zinc-200">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-sans font-bold">
                    <MapPin className="w-4 h-4 text-amber-800" /> DESTINATION:
                  </span>
                  <span className="font-black text-[#3D2310]">
                    {currentUser?.pincode ? `BENGALURU - ${currentUser.pincode}` : "BENGALURU"}
                  </span>
                </div>

                {currentUser?.address && (
                  <div className="text-xs text-zinc-700 font-sans pt-0.5 leading-snug">
                    {currentUser.address}
                  </div>
                )}

                <div className="flex items-center justify-between font-sans pt-1.5 border-t border-zinc-200 text-xs">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-bold">
                    <Package className="w-4 h-4 text-amber-800" /> Lockers Ordered:
                  </span>
                  <span className="font-black text-[#3D2310] font-mono text-sm">
                    {unitCount} {unitCount === 1 ? "Unit" : "Units"}
                  </span>
                </div>

                {onStartOrder && (
                  <button
                    type="button"
                    onClick={onStartOrder}
                    className="w-full mt-2 py-2 px-3 bg-[#3D2310] hover:bg-[#261508] text-[#FAF9F5] font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />
                    <span> ORDER ANOTHER LOCKER</span>
                  </button>
                )}
              </div>

              {/* Status notices */}
              {currentUser?.orderStatus === "delivered" ? (
                <div className="bg-emerald-50 border border-emerald-600/30 p-2.5 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="text-[11px] text-emerald-950 leading-tight">
                    <span className="font-bold">Installed & Live!</span> {currentUser.assignedDevices?.length ? `Locker ${currentUser.assignedDevices.join(", ")} is installed and active.` : "Your locker is active."} You can unlock and operate it securely via the mobile app.
                  </div>
                </div>
              ) : currentUser?.orderStatus === "dispatched" ? (
                <div className="bg-purple-50 border border-purple-600/30 p-2.5 text-xs flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-700 shrink-0" />
                  <div className="text-[11px] text-purple-950 leading-tight">
                    <span className="font-bold">Dispatched:</span> {currentUser.assignedDevices?.length ? `Locker ${currentUser.assignedDevices.join(", ")}` : "Your locker"} is out for delivery with our installation engineer. Doorstep installation will follow shortly.
                  </div>
                </div>
              ) : currentUser?.orderStatus === "preparing" || currentUser?.orderStatus === "approved" ? (
                <div className="bg-blue-50 border border-blue-600/30 p-2.5 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                  <div className="text-[11px] text-blue-950 leading-tight">
                    <span className="font-bold">Order Accepted & Preparing:</span> {currentUser.assignedDevices?.length ? `Assigned Locker: ${currentUser.assignedDevices.join(", ")}.` : "Hardware assigned."} Device is being calibrated and packed at our Bangalore hub.
                  </div>
                </div>
              ) : currentUser?.orderStatus === "rejected" ? (
                <div className="bg-rose-50 border border-rose-600/30 p-2.5 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <div className="text-[11px] text-rose-950 leading-tight">
                    <span className="font-bold">Delivery Notice:</span> We are currently unable to service this address. Please contact customer support.
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/15 border border-amber-600/30 p-2.5 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-800 shrink-0" />
                  <div className="text-[11px] text-[#3D2310] leading-tight">
                    <span className="font-bold">Under Review:</span> Your order request has reached the Bangalore hub. Once accepted, your assigned locker ID will appear here.
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Linked Hardware Overview */}
              <div className="bg-white p-3 border-2 border-[#3D2310]/20 text-xs space-y-2">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-zinc-200">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-bold">
                    <Package className="w-4 h-4 text-amber-800" /> Locker Units:
                  </span>
                  <span className="font-mono font-bold text-[#3D2310]">
                    {unitCount} {unitCount === 1 ? "Unit" : "Units"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-zinc-200">
                  <span className="text-zinc-500 flex items-center gap-1.5 font-bold">
                    <Package className="w-4 h-4 text-amber-800" /> Linked Devices:
                  </span>
                  <span className="font-mono font-bold text-[#3D2310]">
                    {currentUser?.assignedDevices?.length
                      ? `${currentUser.assignedDevices.length} Linked`
                      : "None"}
                  </span>
                </div>

                {currentUser?.assignedDevices?.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentUser.assignedDevices.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-0.5 bg-amber-100 text-[#3D2310] font-mono text-[11px] font-bold border border-amber-300"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 pt-0.5">
                    No locker units linked to this account yet. You can order hardware below or join an existing unit via family code.
                  </p>
                )}
              </div>

              {/* Order Hardware Callout */}
              <div className="bg-amber-500/10 border-2 border-[#3D2310]/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#3D2310]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Doorstep Locker Installation</span>
                </div>
                <p className="text-[11px] text-zinc-700 leading-snug">
                  Get a personal Secure Box delivered and installed at your doorstep in Bengaluru with cellular IoT, OTP keypad, and tamper detection.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="pt-2 border-t-2 border-dashed border-[#3D2310]/30 space-y-2">
          {!hasOrder && onStartOrder && (
            <button
              type="button"
              onClick={onStartOrder}
              className="w-full py-2.5 bg-[#3D2310] hover:bg-[#2A180B] text-amber-100 font-bold text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Package className="w-4 h-4 text-amber-400" />
              <span>ORDER SECURE BOX</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full py-2 bg-transparent hover:bg-rose-50 text-rose-800 border-2 border-rose-800/40 text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>LOGOUT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
