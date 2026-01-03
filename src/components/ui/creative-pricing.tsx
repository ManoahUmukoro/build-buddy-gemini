import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingTier {
  name: string;
  icon: React.ReactNode;
  price: number;
  currency?: string;
  description: string;
  features: string[];
  popular?: boolean;
  color: string;
  buttonText?: string;
  onSelect?: () => void;
  disabled?: boolean;
  isCurrentPlan?: boolean;
}

function CreativePricing({
  tag = "Simple Pricing",
  title = "Choose Your Plan",
  description = "Start free, upgrade when ready",
  tiers,
}: {
  tag?: string;
  title?: string;
  description?: string;
  tiers: PricingTier[];
}) {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 py-12">
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative text-center mb-12 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <Star className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{tag}</span>
        </div>

        <div className="relative inline-block">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {title}
          </h2>
          <div className="absolute -top-2 -right-6 text-2xl animate-bounce">
            ✨
          </div>
        </div>

        <p className="text-muted-foreground max-w-md mx-auto">
          {description}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="relative grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {tiers.map((tier, index) => (
          <div
            key={tier.name}
            className={cn(
              "relative group",
              tier.popular && "md:-mt-4 md:mb-4"
            )}
          >
            {/* Glow effect */}
            <div
              className={cn(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
                tier.color === "purple" && "bg-purple-500/20",
                tier.color === "blue" && "bg-blue-500/20",
                tier.color === "amber" && "bg-amber-500/20",
                tier.color === "green" && "bg-green-500/20"
              )}
            />

            <div
              className={cn(
                "relative rounded-2xl p-6 md:p-8 h-full flex flex-col transition-all duration-300",
                "bg-card border-2",
                tier.popular
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/30",
                "hover:shadow-xl hover:-translate-y-1"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg">
                    <Star className="w-3.5 h-3.5" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    tier.color === "purple" && "bg-purple-500/10 text-purple-500",
                    tier.color === "blue" && "bg-blue-500/10 text-blue-500",
                    tier.color === "amber" && "bg-amber-500/10 text-amber-500",
                    tier.color === "green" && "bg-green-500/10 text-green-500"
                  )}
                >
                  {tier.icon}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tier.description}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-foreground">
                  {tier.price === 0 ? 'Free' : `${tier.currency || '₦'}${tier.price.toLocaleString()}`}
                </span>
                {tier.price > 0 && (
                  <span className="text-muted-foreground">/month</span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                        tier.popular ? "bg-primary text-primary-foreground" : "bg-green-500/10 text-green-500"
                      )}
                    >
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                  "w-full h-12 font-medium",
                  tier.popular && "shadow-lg"
                )}
                variant={tier.popular ? "default" : "outline"}
                size="lg"
                onClick={tier.onSelect}
                disabled={tier.disabled || tier.isCurrentPlan}
              >
                {tier.isCurrentPlan ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Current Plan
                  </>
                ) : (
                  tier.buttonText || 'Get Started'
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-10 left-20 text-4xl opacity-20 rotate-12 pointer-events-none">
        ✎
      </div>
      <div className="absolute top-40 right-16 text-3xl opacity-20 -rotate-12 pointer-events-none">
        ✏️
      </div>
    </div>
  );
}

export { CreativePricing };
export type { PricingTier };
