import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarClock,
  Clock3,
  Info,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { InitialLoadingSkeleton } from "../../../components/feedback/InitialLoadingSkeleton";
import { NetworkErrorFallback } from "../../../components/feedback/NetworkErrorFallback";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../lib/auth/AuthContext";
import { queueApi } from "../api/queueApi";
import type { CorePrediction } from "../api/predictionApi";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { TokenRequestForm } from "../components/TokenRequestForm";
import { useNotifications, useQueue } from "../hooks/useSqps";
import { usePrediction } from "../hooks/usePrediction";
import type { TokenRequestValues } from "../schemas/queueSchemas";

interface ActiveToken {
  tokenId?: string;
  code: string;
  displayTokenNumber?: string;
  dailySequenceNumber?: number;
  date?: string;
  locationId: string;
  location: string;
  service: string;
  estimatedMinutes: number;
  confidenceLow: number;
  confidenceHigh: number;
  peopleAhead: number;
  issuedAt: string;
}
interface RealtimeQueueSnapshot {
  queueId: string;
  peopleAhead?: number;
  waitingCount: number;
  estimatedWaitTime?: number;
  activeCounters?: number;
  queueProgress?: number;
  currentToken?: { code: string; status: string } | null;
}
const TOKEN_KEY = "nexturn.active-token";
function readToken(): ActiveToken | null {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function UserDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [activeToken, setActiveToken] = useState<ActiveToken | null>(readToken);
  const prediction = usePrediction(activeToken?.locationId, undefined, activeToken?.tokenId);
  const realtimeQueue = useQuery<RealtimeQueueSnapshot | null>({
    queryKey: ["realtime-queue", activeToken?.locationId],
    queryFn: async () => null,
    enabled: false,
  });
  const livePrediction = prediction.data
    ? {
        ...prediction.data,
        estimatedWaitMinutes:
          realtimeQueue.data?.estimatedWaitTime ?? prediction.data.estimatedWaitMinutes,
        peopleAhead: realtimeQueue.data?.peopleAhead ?? prediction.data.peopleAhead,
        activeCounters: realtimeQueue.data?.activeCounters ?? prediction.data.activeCounters,
      }
    : undefined;
  const [selectedService, setSelectedService] = useState(
    () => (location.state as { service?: string } | null)?.service ?? "",
  );
  const [selectedLocation, setSelectedLocation] = useState(
    () =>
      (location.state as { location?: string } | null)?.location ??
      "Central Civic Hub",
  );
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showCancellationReason, setShowCancellationReason] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const cancellationMutation = useMutation({
    mutationFn: ({ tokenId, reason }: { tokenId: string; reason: string }) => queueApi.cancelToken(tokenId, reason),
    onSuccess: () => {
      localStorage.setItem(
        "nexturn.last-cancellation",
        JSON.stringify({
          token: activeToken?.code,
          reason: cancellationReason,
          cancelledAt: new Date().toISOString(),
        }),
      );
      saveToken(null);
      setConfirmCancel(false);
      setShowCancellationReason(false);
      setCancellationReason("");
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-core"] });
      navigate("/app/dashboard");
    },
  });

  useEffect(() => {
    const syncActiveToken = () => setActiveToken(readToken());
    window.addEventListener("nexturn-active-token-changed", syncActiveToken);
    return () => window.removeEventListener("nexturn-active-token-changed", syncActiveToken);
  }, []);

  const selectService = (service: string, serviceLocation: string) => {
    setSelectedService(service);
    setSelectedLocation(serviceLocation);
    navigate("/app/token", { state: { service, location: serviceLocation } });
  };
  const saveToken = (token: ActiveToken | null) => {
    setActiveToken(token);
    if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    else localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("nexturn-active-token-changed"));
  };
  const cancelToken = () => {
    if (!cancellationReason || !activeToken?.tokenId) return;
    cancellationMutation.mutate({ tokenId: activeToken.tokenId, reason: cancellationReason });
  };

  if (location.pathname === "/app/services")
    return <ServiceCatalog onSelect={selectService} />;
  if (location.pathname === "/app/token")
    return (
      <TokenIssuance
        selectedService={selectedService}
        selectedLocation={selectedLocation}
        onIssued={(token) => {
          saveToken(token);
          navigate("/app/queue");
        }}
      />
    );
  if (location.pathname === "/app/queue")
    return (
      <>
        <LiveToken
          token={activeToken}
          prediction={livePrediction}
          realtimeQueue={realtimeQueue.data ?? undefined}
          confirmCancel={confirmCancel}
          setConfirmCancel={setConfirmCancel}
          onCancel={() => setShowCancellationReason(true)}
          onFindService={() => navigate("/app/services")}
        />
        {showCancellationReason && (
          <CancellationReasonDialog
            reason={cancellationReason}
            onReasonChange={setCancellationReason}
            onClose={() => {
              setShowCancellationReason(false);
              setCancellationReason("");
            }}
            onConfirm={cancelToken}
            isSubmitting={cancellationMutation.isPending}
            error={cancellationMutation.isError ? getErrorMessage(cancellationMutation.error, "Unable to cancel token. Please try again.") : undefined}
          />
        )}
      </>
    );
  if (location.pathname === "/app/notifications")
    return <NotificationsCenter />;
  return (
    <DashboardOverview
      name={session?.name ?? "User"}
      token={activeToken}
      prediction={livePrediction}
      realtimeQueue={realtimeQueue.data ?? undefined}
      isPredictionSyncing={prediction.isFetching}
      onFindService={() => navigate("/app/services")}
      onViewQueue={() => navigate("/app/queue")}
    />
  );
}

function ServiceCatalog({
  onSelect,
}: {
  onSelect: (service: string, location: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Healthcare");
  const [selectedService, setSelectedService] = useState("");
  const query = useQuery({
    queryKey: ["service-locations"],
    queryFn: queueApi.getLocations,
  });
  if (query.isLoading) return <InitialLoadingSkeleton />;
  if (query.isError)
    return <NetworkErrorFallback onRetry={() => query.refetch()} />;
  const categoryOrder = ["Healthcare", "Banking", "Education & College", "Government & Identity"];
  const categories = categoryOrder.filter((category) => query.data?.some((item) => item.category === category));
  const services = [...new Set((query.data ?? []).filter((item) => item.category === selectedCategory).map((item) => item.service))].sort();
  const visible = (query.data ?? []).filter((item) => {
    const matchesCategory = item.category === selectedCategory;
    const matchesService = !selectedService || item.service === selectedService;
    const matchesSearch = `${item.location} ${item.service} ${item.category}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesCategory && matchesService && matchesSearch;
  });
  return (
    <>
      <PageHeader
        eyebrow="Service discovery"
        title="Find your service"
        description="Choose one of four essential sectors, then select the exact consultation or task you need."
      />
      <label className="card mb-5 flex max-w-xl items-center gap-3 p-3">
        <Search className="text-slate-400" size={19} />
        <span className="sr-only">Search services</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Search by location or service"
        />
      </label>
      <section className="card mb-6 grid gap-4 p-5 md:grid-cols-2" aria-label="Choose a service">
        <label className="text-sm font-bold text-ink" htmlFor="service-category">Service sector
          <select id="service-category" value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setSelectedService(""); }} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20">
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-ink" htmlFor="service-type">{selectedCategory === "Healthcare" ? "Consultation type" : "Work or service required"}
          <select id="service-type" value={selectedService} onChange={(event) => setSelectedService(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20">
            <option value="">View all available options</option>
            {services.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
        </label>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        {visible.map((item) => (
          <article key={item._id} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-ocean">
                <MapPin />
              </span>
              <StatusBadge
                tone={
                  item.status === "Available"
                    ? "success"
                    : item.status === "Busy"
                      ? "warning"
                      : "neutral"
                }
              >
                {item.status}
              </StatusBadge>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ocean">
              {item.category || "General services"}
            </p>
            <h2 className="mt-5 text-lg font-bold">{item.service}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.location}</p>
            <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-400">Predicted wait</p>
                <p className="text-xl font-bold">
                  {item.predictedWaitMinutes} min
                </p>
                <p className={`mt-1 text-xs font-semibold ${item.acceptsTokens ? "text-emerald-700" : "text-amber-700"}`}>
                  {item.tokenAvailabilityReason ?? (item.acceptsTokens ? "Accepting tokens" : "Counter not open")}
                </p>
              </div>
              <Button
                onClick={() => onSelect(item.service, item.location)}
                disabled={!item.acceptsTokens}
                icon={<ArrowRight size={16} />}
              >
                {item.acceptsTokens ? "Select" : "Closed"}
              </Button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function TokenIssuance({
  selectedService,
  selectedLocation,
  onIssued,
}: {
  selectedService: string;
  selectedLocation: string;
  onIssued: (token: ActiveToken) => void;
}) {
  const mutation = useMutation({
    mutationFn: queueApi.requestToken,
    onSuccess: (result, values) =>
      onIssued({
        tokenId: result.tokenId,
        code: result.code,
        displayTokenNumber: result.displayTokenNumber,
        dailySequenceNumber: result.dailySequenceNumber,
        date: result.date,
        locationId: result.locationId,
        location: selectedLocation,
        service: values.service,
        estimatedMinutes: result.estimatedMinutes,
        confidenceLow: Math.max(1, result.estimatedMinutes - 4),
        confidenceHigh: result.estimatedMinutes + 5,
        peopleAhead: Math.max(0, result.position - 1),
        issuedAt: new Date().toISOString(),
      }),
  });
  return (
    <>
      <PageHeader
        eyebrow="Digital token"
        title="Reserve your place"
        description="Confirm the service and contact information used for queue updates."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_.65fr]">
        <TokenRequestForm
          defaultService={selectedService}
          onSubmit={(values: TokenRequestValues) => mutation.mutate(values)}
          isSubmitting={mutation.isPending}
        />
        <aside className="card h-fit p-5">
          <MapPin className="text-ocean" />
          <h2 className="mt-3 font-bold">{selectedLocation}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your token will be issued for this location.
          </p>
          <div className="mt-5 rounded-xl bg-mint p-4 text-sm text-emerald-900">
            <strong>How prediction works</strong>
            <p className="mt-1">
              NexTurn combines current queue length, service complexity, and
              recent counter velocity.
            </p>
          </div>
          {mutation.isError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {getErrorMessage(mutation.error, "Unable to issue a token. Please try again.")}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return typeof error === "object" && error && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;
}

function LiveToken({
  token,
  prediction,
  realtimeQueue,
  confirmCancel,
  setConfirmCancel,
  onCancel,
  onFindService,
}: {
  token: ActiveToken | null;
  prediction?: CorePrediction;
  realtimeQueue?: RealtimeQueueSnapshot;
  confirmCancel: boolean;
  setConfirmCancel: (value: boolean) => void;
  onCancel: () => void;
  onFindService: () => void;
}) {
  if (!token)
    return (
      <section className="card mx-auto max-w-2xl p-10 text-center">
        <Ticket className="mx-auto text-ocean" size={40} />
        <h1 className="mt-4 text-2xl font-bold">No active token</h1>
        <p className="mt-2 text-slate-600">
          Choose a service to reserve your place in a queue.
        </p>
        <Button className="mt-6" onClick={onFindService}>
          Find a service
        </Button>
      </section>
    );
  return (
    <>
      <PageHeader
        eyebrow="Live queue"
        title={`${token.code} is on track`}
        description={`${token.service} at ${token.location}`}
        action={<StatusBadge tone="success">Live</StatusBadge>}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Predicted wait"
          value={`${prediction?.estimatedWaitMinutes ?? token.estimatedMinutes} min`}
          detail={`${prediction?.activeCounters ?? 1} active counter${prediction?.activeCounters === 1 ? "" : "s"}`}
          accent
        />
        <MetricCard
          label="People ahead"
          value={String(prediction?.peopleAhead ?? token.peopleAhead)}
          detail="Actual live queue position"
        />
        <MetricCard
          label="Prediction confidence"
          value={prediction ? `${prediction.predictionConfidenceScore}%` : "--"}
          detail={prediction?.predictionConfidenceText ?? "Awaiting live AI telemetry"}
        />
      </section>
      <section className="card mt-6 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row">
          <div>
            <p className="text-sm font-semibold text-slate-500">
              Explainable prediction
            </p>
            <h2 className="mt-1 text-xl font-bold">
              Current estimate: {prediction?.estimatedWaitMinutes ?? token.estimatedMinutes} minutes
            </h2>
            {realtimeQueue?.currentToken && (
              <p className="mt-1 text-sm text-slate-500">
                Currently serving: <strong>{realtimeQueue.currentToken.code}</strong>
              </p>
            )}
          </div>
          <RefreshCw className="text-aqua" />
        </div>
        <div className="relative mt-9 h-20">
          <div className="absolute left-0 right-0 top-7 h-3 rounded-full bg-slate-100" />
          <div className="absolute left-0 top-7 h-3 rounded-full bg-mint" style={{ width: `${realtimeQueue?.queueProgress ?? 58}%` }} />
          <div className="absolute left-[58%] top-4 h-9 w-1 rounded-full bg-navy" />
          <div className="absolute left-[58%] top-0 -translate-x-1/2 rounded-lg bg-navy px-2 py-1 text-xs font-bold text-white">
            {prediction?.estimatedWaitMinutes ?? token.estimatedMinutes} min
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [Activity, "Queue velocity", "Steady"],
            [Clock3, "Average service", prediction ? `${prediction.averageServiceDurationMinutes} min` : "--"],
            [ShieldCheck, "Confidence", prediction ? `${prediction.predictionConfidenceScore}%` : "--"],
          ].map(([Icon, label, value]) => (
            <div key={label as string} className="rounded-xl bg-slate-50 p-4">
              <Icon size={17} className="text-ocean" />
              <p className="mt-2 text-xs text-slate-500">{label as string}</p>
              <p className="font-bold">{value as string}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5">
          {confirmCancel ? (
            <div
              role="alert"
              className="flex flex-col justify-between gap-3 rounded-xl bg-red-50 p-4 sm:flex-row sm:items-center"
            >
              <p className="text-sm text-red-800">
                <strong>Cancel token {token.code}?</strong> Your queue position
                cannot be recovered.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                  Keep token
                </Button>
                <Button variant="danger" onClick={onCancel}>
                  Confirm cancellation
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              icon={<Trash2 size={16} />}
              onClick={() => setConfirmCancel(true)}
            >
              Cancel token
            </Button>
          )}
        </div>
      </section>
    </>
  );
}

function CancellationReasonDialog({
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  isSubmitting = false,
  error,
}: {
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  error?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancellation-title"
        className="card w-full max-w-md p-6"
      >
        <h2 id="cancellation-title" className="text-xl font-bold">
          Why are you cancelling?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Select a reason before releasing your queue position.
        </p>
        <label className="field-label mt-5" htmlFor="cancellation-reason">
          Cancellation reason
        </label>
        <select
          id="cancellation-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
        >
          <option value="">Select a reason</option>
          <option value="Plans changed">Plans changed</option>
          <option value="Wait time is too long">Wait time is too long</option>
          <option value="Selected the wrong service">
            Selected the wrong service
          </option>
          <option value="Unable to reach the location">
            Unable to reach the location
          </option>
          <option value="Other">Other</option>
        </select>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Go back
          </Button>
          <Button variant="danger" disabled={!reason || isSubmitting} onClick={onConfirm}>
            {isSubmitting ? "Cancelling..." : "Cancel token"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function NotificationsCenter() {
  const query = useNotifications();
  if (query.isLoading) return <InitialLoadingSkeleton />;
  if (query.isError)
    return <NetworkErrorFallback onRetry={() => query.refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow="Notifications"
        title="Your updates"
        description="Queue, account, and system updates in one place."
      />
      <section className="card divide-y divide-slate-100 overflow-hidden">
        {query.data?.map((notification) => (
          <button
            key={notification.id}
            onClick={() =>
              notification.href &&
              window.history.pushState({}, "", notification.href)
            }
            className={`flex w-full gap-4 p-5 text-left hover:bg-slate-50 ${notification.read ? "" : "bg-mint/40"}`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${notification.read ? "bg-slate-100 text-slate-500" : "bg-navy text-white"}`}
            >
              <Bell size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex justify-between gap-3">
                <strong>{notification.title}</strong>
                <time className="shrink-0 text-xs text-slate-400">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </time>
              </span>
              <span className="mt-1 block text-sm text-slate-600">
                {notification.body}
              </span>
            </span>
          </button>
        ))}
      </section>
    </>
  );
}

function DashboardOverview({
  name,
  token,
  prediction,
  realtimeQueue,
  isPredictionSyncing,
  onFindService,
  onViewQueue,
}: {
  name: string;
  token: ActiveToken | null;
  prediction?: CorePrediction;
  realtimeQueue?: RealtimeQueueSnapshot;
  isPredictionSyncing: boolean;
  onFindService: () => void;
  onViewQueue: () => void;
}) {
  const [greeting, setGreeting] = useState("Good morning");
  const queue = useQueue();
  const liveCounterCount = prediction?.activeCounters ?? 1;
  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      setGreeting(
        hour < 12
          ? "Good morning"
          : hour < 17
            ? "Good afternoon"
            : "Good evening",
      );
    };
    updateGreeting();
    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (queue.isLoading) return <InitialLoadingSkeleton />;
  if (queue.isError)
    return <NetworkErrorFallback onRetry={() => queue.refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow="User workspace"
        title={`${greeting}, ${name.split(" ")[0]}.`}
        description="Discover services, reserve a token, and follow your live prediction."
        action={
          <Button onClick={onFindService} icon={<Search size={17} />}>
            Find a service
          </Button>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Estimated wait"
          value={token ? `${prediction?.estimatedWaitMinutes ?? token.estimatedMinutes} min` : "--"}
          detail={
            token
              ? `${liveCounterCount} active counter${liveCounterCount === 1 ? "" : "s"}${isPredictionSyncing ? " · syncing" : ""}`
              : "No active token"
          }
          accent
        />
        <MetricCard
          label="People ahead"
          value={token ? String(prediction?.peopleAhead ?? token.peopleAhead) : "--"}
          detail={token ? `Live queue position${realtimeQueue?.currentToken ? ` · serving ${realtimeQueue.currentToken.code}` : ""}` : "Select a service to begin"}
        />
        <MetricCard
          label="Prediction confidence"
          value={token && prediction ? `${prediction.predictionConfidenceScore}%` : "--"}
          detail={prediction?.predictionConfidenceText ?? "Explainable live estimate"}
        />
      </section>
      {token ? (
        <section className="card mt-6 p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <StatusBadge tone="success">On track</StatusBadge>
              <h2 className="mt-3 text-xl font-bold">{token.service}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <MapPin size={14} />
                {token.location}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">Token</p>
                <p className="text-2xl font-bold">{token.code}</p>
              </div>
              <Button onClick={onViewQueue}>Track live</Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="card mt-6 p-8 text-center">
          <CalendarClock className="mx-auto text-ocean" size={35} />
          <h2 className="mt-4 text-xl font-bold">Ready when you are</h2>
          <p className="mt-2 text-slate-600">
            Find a location and service to get your predicted wait before
            joining.
          </p>
          <Button className="mt-5" onClick={onFindService}>
            Explore services
          </Button>
        </section>
      )}
      <section
        id="notifications"
        className="card mt-6 flex items-center gap-4 p-5"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-ocean">
          <Info />
        </span>
        <div>
          <p className="font-bold">Notifications are ready</p>
          <p className="text-sm text-slate-600">
            We will alert you as your turn approaches.
          </p>
        </div>
      </section>
    </>
  );
}
