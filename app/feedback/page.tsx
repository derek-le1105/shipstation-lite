import Form from "@/components/feedback/form";

export const metadata = {
  title: "UNS Shipping Manager - Feedback",
};

export default function FeedbackPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Share your feedback
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell us what&apos;s working well and what we can improve.
        </p>
      </section>
      <Form />
    </div>
  );
}
