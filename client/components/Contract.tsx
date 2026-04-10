"use client";

import { useState, useCallback } from "react";
import {
  createAuction,
  bid,
  endAuction,
  getAuction,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m12 18-4-4" />
      <path d="M8 18v-3" />
      <path d="M16 18v-3" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#f97316]/30 focus-within:shadow-[0_0_20px_rgba(249,115,22,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Status Config ────────────────────────────────────────────

const AUCTION_STATUS = {
  active: { color: "text-[#34d399]", bg: "bg-[#34d399]/10", border: "border-[#34d399]/20", dot: "bg-[#34d399]", variant: "success" as const },
  ended: { color: "text-[#f97316]", bg: "bg-[#f97316]/10", border: "border-[#f97316]/20", dot: "bg-[#f97316]", variant: "warning" as const },
};

// ── Main Component ───────────────────────────────────────────

type Tab = "view" | "create" | "bid" | "end";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("view");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [bidAmount, setBidAmount] = useState("");
  const [isBidding, setIsBidding] = useState(false);

  const [isEnding, setIsEnding] = useState(false);
  const [auctionData, setAuctionData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleCreateAuction = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!itemName.trim()) return setError("Enter item name");
    setError(null);
    setIsCreating(true);
    setTxStatus("Awaiting signature...");
    try {
      await createAuction(walletAddress, itemName.trim());
      setTxStatus("Auction created on-chain!");
      setItemName("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsCreating(false);
    }
  }, [walletAddress, itemName]);

  const handlePlaceBid = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!bidAmount.trim() || Number(bidAmount) <= 0) return setError("Enter a valid bid amount");
    setError(null);
    setIsBidding(true);
    setTxStatus("Awaiting signature...");
    try {
      await bid(walletAddress, BigInt(bidAmount.trim()));
      setTxStatus("Bid placed on-chain!");
      setBidAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsBidding(false);
    }
  }, [walletAddress, bidAmount]);

  const handleEndAuction = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    setError(null);
    setIsEnding(true);
    setTxStatus("Awaiting signature...");
    try {
      await endAuction(walletAddress);
      setTxStatus("Auction ended on-chain!");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsEnding(false);
    }
  }, [walletAddress]);

  const handleGetAuction = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setAuctionData(null);
    try {
      const result = await getAuction(walletAddress || undefined);
      if (result && typeof result === "object") {
        setAuctionData(result as Record<string, unknown>);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "view", label: "View", icon: <GavelIcon />, color: "#4fc3f7" },
    { key: "create", label: "Create", icon: <FlagIcon />, color: "#f97316" },
    { key: "bid", label: "Bid", icon: <CurrencyIcon />, color: "#34d399" },
    { key: "end", label: "End", icon: <CheckIcon />, color: "#fbbf24" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f97316]/20 to-[#fbbf24]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#f97316]">
                  <path d="m3 17 2 2 4-4" />
                  <path d="M3 7 5 5l6-6" />
                  <path d="m21 7-2-2-4 4" />
                  <path d="M21 17-2 2-4-4" />
                  <path d="M14 3h7v7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Auction Platform</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* View Auction */}
            {activeTab === "view" && (
              <div className="space-y-5">
                <MethodSignature name="get_auction" params="()" returns="-> Auction" color="#4fc3f7" />
                <ShimmerButton onClick={handleGetAuction} disabled={isLoading} shimmerColor="#4fc3f7" className="w-full">
                  {isLoading ? <><SpinnerIcon /> Loading...</> : <><GavelIcon /> View Auction</>}
                </ShimmerButton>

                {auctionData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Auction Details</span>
                      {(() => {
                        const ended = auctionData.ended === true;
                        const cfg = ended ? AUCTION_STATUS.ended : AUCTION_STATUS.active;
                        return (
                          <Badge variant={cfg.variant}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                            {ended ? "Ended" : "Active"}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Item</span>
                        <span className="font-mono text-sm text-white/80">{String(auctionData.item || "N/A")}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Highest Bid</span>
                        <span className="font-mono text-sm text-white/80">{String(auctionData.highest_bid || 0)} XLM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Highest Bidder</span>
                        <span className="font-mono text-sm text-white/80 truncate max-w-[150px]">{truncate(String(auctionData.highest_bidder || ""))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Seller</span>
                        <span className="font-mono text-sm text-white/80 truncate max-w-[150px]">{truncate(String(auctionData.seller || ""))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Create Auction */}
            {activeTab === "create" && (
              <div className="space-y-5">
                <MethodSignature name="create_auction" params="(seller: Address, item: Symbol)" color="#f97316" />
                <Input label="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. ART-001 or Vintage Watch" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleCreateAuction} disabled={isCreating} shimmerColor="#f97316" className="w-full">
                    {isCreating ? <><SpinnerIcon /> Creating...</> : <><FlagIcon /> Create Auction</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#f97316]/20 bg-[#f97316]/[0.03] py-4 text-sm text-[#f97316]/60 hover:border-[#f97316]/30 hover:text-[#f97316]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to create auction
                  </button>
                )}
              </div>
            )}

            {/* Place Bid */}
            {activeTab === "bid" && (
              <div className="space-y-5">
                <MethodSignature name="bid" params="(bidder: Address, amount: i128)" color="#34d399" />
                <Input 
                  label="Bid Amount (XLM)" 
                  type="number"
                  value={bidAmount} 
                  onChange={(e) => setBidAmount(e.target.value)} 
                  placeholder="Enter amount in XLM (1 XLM = 10000000 stroops)"
                />
                {walletAddress ? (
                  <ShimmerButton onClick={handlePlaceBid} disabled={isBidding} shimmerColor="#34d399" className="w-full">
                    {isBidding ? <><SpinnerIcon /> Placing Bid...</> : <><CurrencyIcon /> Place Bid</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to place bid
                  </button>
                )}
              </div>
            )}

            {/* End Auction */}
            {activeTab === "end" && (
              <div className="space-y-5">
                <MethodSignature name="end_auction" params="(seller: Address)" color="#fbbf24" />
                <p className="text-sm text-white/50">End the auction as the seller to finalize it and announce the winner.</p>
                {walletAddress ? (
                  <ShimmerButton onClick={handleEndAuction} disabled={isEnding} shimmerColor="#fbbf24" className="w-full">
                    {isEnding ? <><SpinnerIcon /> Ending...</> : <><CheckIcon /> End Auction</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-4 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to end auction
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Auction Platform &middot; Soroban</p>
            <div className="flex items-center gap-2">
              {["Active", "Ended"].map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className={cn("h-1 w-1 rounded-full", AUCTION_STATUS[s.toLowerCase() as keyof typeof AUCTION_STATUS]?.dot ?? "bg-white/20")} />
                  <span className="font-mono text-[9px] text-white/15">{s}</span>
                  {i < 1 && <span className="text-white/10 text-[8px]">&rarr;</span>}
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}