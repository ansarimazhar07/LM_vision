import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './auth/AuthProvider';
import { AppNavigator } from './navigation/AppNavigator';
import { InspectionWorkflowProvider } from './state/InspectionWorkflowProvider';

export default function App(): React.JSX.Element {
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
