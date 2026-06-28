import { zodResolver } from "@hookform/resolvers/zod";
import { Ticket } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import {
  tokenRequestSchema,
  type TokenRequestValues,
} from "../schemas/queueSchemas";

export function TokenRequestForm({
  onSubmit,
  isSubmitting = false,
  defaultService = "",
}: {
  onSubmit: (values: TokenRequestValues) => void;
  isSubmitting?: boolean;
  defaultService?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TokenRequestValues>({
    resolver: zodResolver(tokenRequestSchema),
    defaultValues: { service: defaultService, accessibility: false },
  });
  return (
    <form className="card space-y-5 p-6" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label className="field-label" htmlFor="service">
          Service
        </label>
        <select
          id="service"
          className="min-h-11 w-full rounded-xl border border-slate-300 px-3"
          {...register("service")}
        >
          <option value="">Select a service</option>
          {defaultService &&
            ![
              "Identity renewal",
              "Address update",
              "Document collection",
            ].includes(defaultService) && (
              <option value={defaultService}>{defaultService}</option>
            )}
          <option>Identity renewal</option>
          <option>Address update</option>
          <option>Document collection</option>
        </select>
        {errors.service && (
          <p className="mt-1 text-sm text-red-700">{errors.service.message}</p>
        )}
      </div>
      <Input
        label="Mobile number"
        placeholder="+91 98765 43210"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          {...register("accessibility")}
        />
        <span>
          <strong className="block text-ink">
            I may need accessibility support
          </strong>
          <span className="text-slate-500">
            The service team will prepare appropriate assistance.
          </span>
        </span>
      </label>
      <Button
        className="w-full"
        icon={<Ticket size={18} />}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Reserving your place..." : "Confirm and get token"}
      </Button>
    </form>
  );
}
