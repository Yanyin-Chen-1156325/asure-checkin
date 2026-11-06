"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { TemplateDocument } from "@/components/templates/template-document";
import { AGREEMENT_ACKNOWLEDGEMENT, AGREEMENT_GUEST_FIELDS, AGREEMENT_SIGNATURE_HEADING, type TemplateContent } from "@/lib/templates/content";

type Guest = Readonly<{ name: string; email: string; phone: string; vehicle: string; walkIn: boolean }>;
type GuestField = "name" | "email" | "phone" | "vehicle";

export function RegistrationForm({ token, content, guest }: Readonly<{ token: string; content: TemplateContent; guest: Guest }>) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [values, setValues] = useState(guest);
  const [accepted, setAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rectangle = canvas.getBoundingClientRect();
      const snapshot = hasSignature ? canvas.toDataURL() : "";
      canvas.width = Math.max(1, Math.round(rectangle.width * ratio));
      canvas.height = Math.round(180 * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.lineWidth = 2.4;
      context.lineCap = "round";
      context.strokeStyle = "#17201d";
      if (snapshot) {
        const image = new Image();
        image.onload = () => context.drawImage(image, 0, 0, rectangle.width, 180);
        image.src = snapshot;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [hasSignature]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const context = event.currentTarget.getContext("2d");
    const position = point(event);
    context?.beginPath();
    context?.moveTo(position.x, position.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    const position = point(event);
    context?.lineTo(position.x, position.y);
    context?.stroke();
    setHasSignature(true);
  }

  function stop() { drawing.current = false; }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  function validationMessage(): string {
    if (!values.name.trim()) return "Enter the guest's full name.";
    if (!values.email.trim()) return "Enter the guest's email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return "Enter a valid email address.";
    if (!values.phone.trim()) return "Enter the guest's phone number.";
    if (!accepted) return "Confirm that you have read and understood the agreement.";
    if (!hasSignature || !canvasRef.current) return "Please draw the guest signature.";
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const message = validationMessage();
    if (message) { setError(message); return; }
    if (!canvasRef.current) return;
    setPending(true);
    try {
      const response = await fetch(`/api/signing/${encodeURIComponent(token)}`, {
        method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          vehicle: values.vehicle,
          accepted,
          signature: canvasRef.current.toDataURL("image/png"),
        }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "The registration card could not be signed.");
      clear();
      setAccepted(false);
      setValues({ name: "", email: "", phone: "", vehicle: "", walkIn: guest.walkIn });
      router.push("/sign/complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The registration card could not be signed.");
    } finally {
      setPending(false);
    }
  }

  const field = (key: GuestField) => {
    const definition = AGREEMENT_GUEST_FIELDS.find((candidate) => candidate.key === key)!;
    return (
      <label className="agreement-form-field" htmlFor={`guest-${key}`}>
        <span>{definition.label}{definition.required ? <b aria-hidden="true"> *</b> : null}</span>
        <input
          autoComplete={key === "name" ? "name" : key === "vehicle" ? "off" : key}
          disabled={key === "name" && !guest.walkIn}
          id={`guest-${key}`}
          maxLength={key === "email" ? 254 : key === "phone" ? 50 : key === "vehicle" ? 100 : 200}
          onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
          placeholder={definition.placeholder}
          required={definition.required}
          type={definition.type}
          value={values[key]}
        />
      </label>
    );
  };

  const guestFields = <section className="agreement-system-section">
    <h2>Guest Information</h2>
    <p className="agreement-required-note"><b>*</b> Required fields</p>
    <div className="agreement-form-grid">
      {AGREEMENT_GUEST_FIELDS.map((definition) => <div key={definition.key}>{field(definition.key)}</div>)}
    </div>
  </section>;

  const acknowledgement = <label className="agreement-acknowledgement">
    <input checked={accepted} name="accepted" onChange={(event) => setAccepted(event.target.checked)} required type="checkbox" />
    <span>{AGREEMENT_ACKNOWLEDGEMENT} <b aria-hidden="true">*</b></span>
  </label>;

  const signature = <section className="agreement-signature">
    <h2>{AGREEMENT_SIGNATURE_HEADING} <b aria-hidden="true">*</b></h2>
    <p>Sign below using your finger, mouse, or stylus. The signing date and time are recorded automatically.</p>
    <canvas aria-label="Signature pad" className="signature-canvas" onPointerCancel={stop} onPointerDown={start} onPointerMove={move} onPointerUp={stop} ref={canvasRef} />
    <button className="signature-clear" onClick={clear} type="button">Clear signature</button>
  </section>;

  return <form className="space-y-6" noValidate onSubmit={submit}>
    <section className="a4-document rounded-xl border border-[var(--border)] bg-white p-5 sm:p-8">
      <TemplateDocument content={content} systemSlots={{ guestFields, acknowledgement, signature }} />
    </section>
    {error ? <p className="rounded-xl bg-red-50 p-4 font-bold text-[var(--danger)]" role="alert">{error}</p> : null}
    <button className="min-h-14 w-full rounded-xl bg-[var(--brand)] px-6 text-lg font-bold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Creating signed PDF…" : "Complete registration"}</button>
  </form>;
}
