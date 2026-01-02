import { useState, useMemo } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calculator, ChevronRight, ChevronLeft, DollarSign, Clock, 
  Percent, Target, Info, CheckCircle2, TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FreelancerPricingToolProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  monthlyCosts?: number; // Auto-pulled from finance data
}

type Step = 'costs' | 'tax' | 'capacity' | 'results';

interface FormData {
  livingCosts: number;
  businessCosts: number;
  subscriptionCosts: number;
  savingsTarget: number;
  taxRate: number;
  workingDaysPerMonth: number;
  hoursPerDay: number;
  billableEfficiency: number;
  profitMargin: number;
  projectHours: number;
}

export function FreelancerPricingTool({
  isOpen,
  onClose,
  currency,
  monthlyCosts = 0,
}: FreelancerPricingToolProps) {
  const [step, setStep] = useState<Step>('costs');
  const [formData, setFormData] = useState<FormData>({
    livingCosts: monthlyCosts * 0.5,
    businessCosts: monthlyCosts * 0.2,
    subscriptionCosts: monthlyCosts * 0.1,
    savingsTarget: monthlyCosts * 0.2,
    taxRate: 10,
    workingDaysPerMonth: 22,
    hoursPerDay: 8,
    billableEfficiency: 70,
    profitMargin: 20,
    projectHours: 40,
  });

  const steps: Step[] = ['costs', 'tax', 'capacity', 'results'];
  const currentStepIndex = steps.indexOf(step);

  const totalMonthlyCosts = useMemo(() => 
    formData.livingCosts + 
    formData.businessCosts + 
    formData.subscriptionCosts + 
    formData.savingsTarget,
    [formData.livingCosts, formData.businessCosts, formData.subscriptionCosts, formData.savingsTarget]
  );

  const calculations = useMemo(() => {
    const taxRateDecimal = formData.taxRate / 100;
    const profitMarginDecimal = formData.profitMargin / 100;
    const efficiencyDecimal = formData.billableEfficiency / 100;

    // Required pre-tax income
    const requiredPreTax = totalMonthlyCosts / (1 - taxRateDecimal);
    
    // Target revenue with profit margin
    const targetRevenue = requiredPreTax * (1 + profitMarginDecimal);
    
    // Billable hours per month
    const billableHours = formData.workingDaysPerMonth * formData.hoursPerDay * efficiencyDecimal;
    
    // Hourly rate
    const hourlyRate = billableHours > 0 ? targetRevenue / billableHours : 0;
    
    // Daily rate (based on billable hours per day, not full day)
    const billableHoursPerDay = formData.hoursPerDay * efficiencyDecimal;
    const dailyRate = hourlyRate * billableHoursPerDay;
    
    // Project price
    const projectPrice = hourlyRate * formData.projectHours;

    return {
      requiredPreTax,
      targetRevenue,
      billableHours,
      hourlyRate,
      dailyRate,
      projectPrice,
      taxAmount: requiredPreTax - totalMonthlyCosts,
      profitAmount: targetRevenue - requiredPreTax,
    };
  }, [formData, totalMonthlyCosts]);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const updateField = (field: keyof FormData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderTooltip = (text: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info size={14} className="text-muted-foreground cursor-help ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Freelancer Pricing Calculator"
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between px-2">
          {steps.map((s, idx) => (
            <div key={s} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  idx <= currentStepIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx < currentStepIndex ? <CheckCircle2 size={18} /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${
                  idx < currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Monthly Costs */}
        {step === 'costs' && (
          <div className="space-y-4 animate-in slide-in-from-right-5">
            <div className="text-center mb-4">
              <DollarSign className="mx-auto text-primary mb-2" size={32} />
              <h3 className="font-bold text-lg">Monthly Costs</h3>
              <p className="text-sm text-muted-foreground">What are your monthly expenses?</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="flex items-center">
                  Living Costs
                  {renderTooltip('Rent, food, utilities, personal expenses')}
                </Label>
                <Input
                  type="number"
                  value={formData.livingCosts || ''}
                  onChange={(e) => updateField('livingCosts', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="flex items-center">
                  Business Costs
                  {renderTooltip('Software, equipment, marketing, office space')}
                </Label>
                <Input
                  type="number"
                  value={formData.businessCosts || ''}
                  onChange={(e) => updateField('businessCosts', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="flex items-center">
                  Subscriptions
                  {renderTooltip('Tools, services, memberships')}
                </Label>
                <Input
                  type="number"
                  value={formData.subscriptionCosts || ''}
                  onChange={(e) => updateField('subscriptionCosts', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="flex items-center">
                  Savings Target
                  {renderTooltip('Emergency fund, investments, retirement')}
                </Label>
                <Input
                  type="number"
                  value={formData.savingsTarget || ''}
                  onChange={(e) => updateField('savingsTarget', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Monthly Costs:</span>
                <span className="font-bold text-primary">{formatCurrency(totalMonthlyCosts, currency)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Tax Settings */}
        {step === 'tax' && (
          <div className="space-y-4 animate-in slide-in-from-right-5">
            <div className="text-center mb-4">
              <Percent className="mx-auto text-primary mb-2" size={32} />
              <h3 className="font-bold text-lg">Tax & Profit</h3>
              <p className="text-sm text-muted-foreground">Set your tax rate and profit margin</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="flex items-center">
                  Tax Rate (%)
                  {renderTooltip('Your effective tax rate on income. In Nigeria, personal income tax ranges from 7-24%.')}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.taxRate || ''}
                    onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Common rates: 7% (low income), 15% (middle), 24% (high)
                </p>
              </div>

              <div>
                <Label className="flex items-center">
                  Profit Margin (%)
                  {renderTooltip('Additional profit above your costs. This builds your business and creates a buffer.')}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="200"
                    value={formData.profitMargin || ''}
                    onChange={(e) => updateField('profitMargin', parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 15-30% for sustainable growth
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Work Capacity */}
        {step === 'capacity' && (
          <div className="space-y-4 animate-in slide-in-from-right-5">
            <div className="text-center mb-4">
              <Clock className="mx-auto text-primary mb-2" size={32} />
              <h3 className="font-bold text-lg">Work Capacity</h3>
              <p className="text-sm text-muted-foreground">How much can you realistically work?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="flex items-center">
                  Working Days per Month
                  {renderTooltip('Typical month has 20-22 working days')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.workingDaysPerMonth || ''}
                  onChange={(e) => updateField('workingDaysPerMonth', parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label className="flex items-center">
                  Hours per Day
                  {renderTooltip('Total hours you work, not just billable hours')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.hoursPerDay || ''}
                  onChange={(e) => updateField('hoursPerDay', parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label className="flex items-center">
                  Billable Efficiency (%)
                  {renderTooltip('Percentage of time spent on actual billable work. Account for admin, marketing, breaks. 60-75% is realistic.')}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={formData.billableEfficiency || ''}
                    onChange={(e) => updateField('billableEfficiency', parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-muted-foreground">%</span>
                </div>
              </div>

              <div>
                <Label className="flex items-center">
                  Project Estimate (hours)
                  {renderTooltip('For calculating project-based pricing')}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.projectHours || ''}
                  onChange={(e) => updateField('projectHours', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Billable Hours/Month:</span>
                <span className="font-bold text-primary">
                  {Math.round(formData.workingDaysPerMonth * formData.hoursPerDay * (formData.billableEfficiency / 100))} hrs
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && (
          <div className="space-y-4 animate-in slide-in-from-right-5">
            <div className="text-center mb-4">
              <Target className="mx-auto text-success mb-2" size={32} />
              <h3 className="font-bold text-lg">Your Pricing</h3>
              <p className="text-sm text-muted-foreground">Based on your inputs</p>
            </div>

            {/* Main Results */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">Hourly Rate</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(calculations.hourlyRate, currency)}
                </p>
              </div>
              <div className="bg-success/10 p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">Daily Rate</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(calculations.dailyRate, currency)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">Monthly Target</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(calculations.targetRevenue, currency)}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">Project ({formData.projectHours}hrs)</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(calculations.projectPrice, currency)}
                </p>
              </div>
            </div>

            {/* Breakdown */}
            <details className="bg-muted/50 rounded-lg p-3">
              <summary className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <TrendingUp size={14} />
                View Breakdown
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Costs</span>
                  <span>{formatCurrency(totalMonthlyCosts, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Tax Reserve ({formData.taxRate}%)</span>
                  <span>{formatCurrency(calculations.taxAmount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">= Pre-tax Required</span>
                  <span>{formatCurrency(calculations.requiredPreTax, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Profit ({formData.profitMargin}%)</span>
                  <span>{formatCurrency(calculations.profitAmount, currency)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-2">
                  <span>= Target Revenue</span>
                  <span className="text-primary">{formatCurrency(calculations.targetRevenue, currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-xs pt-2">
                  <span>÷ Billable Hours ({calculations.billableHours.toFixed(0)} hrs)</span>
                  <span>= {formatCurrency(calculations.hourlyRate, currency)}/hr</span>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ChevronLeft size={16} className="mr-1" />
              Back
            </Button>
          )}
          {step !== 'results' ? (
            <Button onClick={handleNext} className="flex-1">
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={onClose} className="flex-1">
              Done
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
