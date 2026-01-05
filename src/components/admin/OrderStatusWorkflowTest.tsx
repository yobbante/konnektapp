import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Play, RotateCcw } from "lucide-react";
import { 
  ORDER_STATUS, 
  ORDER_STATUS_WORKFLOW, 
  assertValidOrderStatus, 
  getOrderStatusLabel,
  isValidOrderStatus,
  getNextOrderStatus
} from "@/lib/enumMappings";
import type { OrderStatus } from "@/lib/enumMappings";

interface TestStep {
  id: string;
  name: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
}

export const OrderStatusWorkflowTest = () => {
  const [testSteps, setTestSteps] = useState<TestStep[]>([
    { id: '1', name: 'Validation ENUM pending', fromStatus: null, toStatus: 'pending', status: 'pending' },
    { id: '2', name: 'Transition pending → accepted', fromStatus: 'pending', toStatus: 'accepted', status: 'pending' },
    { id: '3', name: 'Transition accepted → collected', fromStatus: 'accepted', toStatus: 'collected', status: 'pending' },
    { id: '4', name: 'Transition collected → in_transit', fromStatus: 'collected', toStatus: 'in_transit', status: 'pending' },
    { id: '5', name: 'Transition in_transit → delivered', fromStatus: 'in_transit', toStatus: 'delivered', status: 'pending' },
    { id: '6', name: 'Rejet valeur française "En attente"', fromStatus: null, toStatus: 'pending', status: 'pending' },
    { id: '7', name: 'Rejet valeur invalide "invalid_status"', fromStatus: null, toStatus: 'pending', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateStep = (id: string, updates: Partial<TestStep>) => {
    setTestSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Reset all steps
    setTestSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, error: undefined, duration: undefined })));

    // Test 1: Validate ENUM value 'pending'
    await runTest('1', async () => {
      const isValid = isValidOrderStatus('pending');
      if (!isValid) throw new Error("'pending' devrait être valide");
      assertValidOrderStatus('pending'); // Should not throw
    });

    // Test 2-5: Validate workflow transitions
    const transitions: Array<{ id: string; from: OrderStatus; to: OrderStatus }> = [
      { id: '2', from: 'pending', to: 'accepted' },
      { id: '3', from: 'accepted', to: 'collected' },
      { id: '4', from: 'collected', to: 'in_transit' },
      { id: '5', from: 'in_transit', to: 'delivered' },
    ];

    for (const transition of transitions) {
      await runTest(transition.id, async () => {
        // Validate both statuses
        assertValidOrderStatus(transition.from);
        assertValidOrderStatus(transition.to);
        
        // Validate workflow allows this transition
        const nextInfo = getNextOrderStatus(transition.from);
        if (nextInfo.nextStatus !== transition.to) {
          throw new Error(`Transition ${transition.from} → ${transition.to} non autorisée par le workflow`);
        }
        
        // Validate labels exist
        const fromLabel = getOrderStatusLabel(transition.from);
        const toLabel = getOrderStatusLabel(transition.to);
        if (!fromLabel || !toLabel) {
          throw new Error("Labels manquants pour les statuts");
        }
      });
    }

    // Test 6: Reject French value
    await runTest('6', async () => {
      try {
        assertValidOrderStatus("En attente");
        throw new Error("Aurait dû rejeter 'En attente'");
      } catch (e) {
        if (e instanceof Error && e.message.includes("Aurait dû rejeter")) {
          throw e;
        }
        // Expected error - test passes
      }
    });

    // Test 7: Reject invalid value
    await runTest('7', async () => {
      try {
        assertValidOrderStatus("invalid_status");
        throw new Error("Aurait dû rejeter 'invalid_status'");
      } catch (e) {
        if (e instanceof Error && e.message.includes("Aurait dû rejeter")) {
          throw e;
        }
        // Expected error - test passes
      }
    });

    setIsRunning(false);
  };

  const runTest = async (id: string, testFn: () => Promise<void>) => {
    updateStep(id, { status: 'running' });
    const startTime = Date.now();
    
    try {
      await testFn();
      updateStep(id, { 
        status: 'passed', 
        duration: Date.now() - startTime 
      });
    } catch (error) {
      updateStep(id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration: Date.now() - startTime 
      });
    }
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 200));
  };

  const resetTests = () => {
    setTestSteps(prev => prev.map(step => ({ 
      ...step, 
      status: 'pending' as const, 
      error: undefined, 
      duration: undefined 
    })));
  };

  const passedCount = testSteps.filter(s => s.status === 'passed').length;
  const failedCount = testSteps.filter(s => s.status === 'failed').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Test Workflow ENUM Statuts</CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={resetTests} 
            variant="outline" 
            size="sm"
            disabled={isRunning}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button 
            onClick={runTests} 
            size="sm"
            disabled={isRunning}
          >
            <Play className="h-4 w-4 mr-1" />
            {isRunning ? 'En cours...' : 'Lancer les tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        {(passedCount > 0 || failedCount > 0) && (
          <div className="flex gap-4 mb-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              Résultats: {passedCount}/{testSteps.length} réussis
            </span>
            {failedCount > 0 && (
              <Badge variant="destructive">{failedCount} échec(s)</Badge>
            )}
            {passedCount === testSteps.length && (
              <Badge className="bg-green-500">Tous les tests passent ✓</Badge>
            )}
          </div>
        )}

        {/* Test steps */}
        <div className="space-y-2">
          {testSteps.map((step) => (
            <div 
              key={step.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                step.status === 'passed' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                step.status === 'failed' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' :
                step.status === 'running' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' :
                'bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                {step.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {step.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                {step.status === 'running' && (
                  <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                )}
                {step.status === 'pending' && (
                  <div className="h-5 w-5 border-2 border-muted-foreground/30 rounded-full" />
                )}
                <div>
                  <p className="font-medium text-sm">{step.name}</p>
                  {step.error && (
                    <p className="text-xs text-red-600 mt-1">{step.error}</p>
                  )}
                </div>
              </div>
              {step.duration !== undefined && (
                <span className="text-xs text-muted-foreground">{step.duration}ms</span>
              )}
            </div>
          ))}
        </div>

        {/* ENUM Values Reference */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Valeurs ENUM PostgreSQL valides :</h4>
          <div className="flex flex-wrap gap-2">
            {Object.keys(ORDER_STATUS).map((status) => (
              <Badge key={status} variant="outline" className="font-mono text-xs">
                {status} → {getOrderStatusLabel(status)}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
