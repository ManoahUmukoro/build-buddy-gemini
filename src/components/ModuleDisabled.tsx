import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ModuleDisabledProps {
  moduleName: string;
}

export function ModuleDisabled({ moduleName }: ModuleDisabledProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Module Disabled</h3>
            <p className="text-muted-foreground text-sm mt-1">
              The {moduleName} module has been temporarily disabled by the administrator.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Please check back later or contact support if you need assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
