import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './auth/AuthProvider';
import { AppNavigator } from './navigation/AppNavigator';
import { InspectionWorkflowProvider } from './state/InspectionWorkflowProvider';
import { initNativeOcrBridge } from './services/ai/nativeOcrBridge';

export default function App(): React.JSX.Element {
  useEffect(() => {
    initNativeOcrBridge();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <InspectionWorkflowProvider>
          <AppNavigator />
        </InspectionWorkflowProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
