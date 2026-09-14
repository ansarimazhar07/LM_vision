import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthProvider';
import { StateView } from '../components/StateView';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NewInspectionScreen } from '../screens/NewInspectionScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DeferredScreen } from '../screens/DeferredScreen';
import { ImageCaptureScreen } from '../screens/ImageCaptureScreen';
import { ImageReviewScreen } from '../screens/ImageReviewScreen';
import { ProcessingScreen } from '../screens/ProcessingScreen';
import { InspectionResultScreen } from '../screens/InspectionResultScreen';
import { DeclarationsScreen } from '../screens/DeclarationsScreen';
import { FindingsScreen } from '../screens/FindingsScreen';
import { FindingDetailScreen } from '../screens/FindingDetailScreen';
import { EvidenceScreen } from '../screens/EvidenceScreen';
import { InspectorDecisionScreen } from '../screens/InspectorDecisionScreen';
import { InspectorReviewScreen } from '../screens/InspectorReviewScreen';
import { EvidenceViewerScreen } from '../screens/EvidenceViewerScreen';
import { ReviewSummaryScreen } from '../screens/ReviewSummaryScreen';
import { InspectionDetailScreen } from '../screens/InspectionDetailScreen';
import { ReportPreviewScreen } from '../screens/ReportPreviewScreen';
import { RuleLibraryScreen } from '../screens/RuleLibraryScreen';
import { LegalRuleDetailScreen } from '../screens/LegalRuleDetailScreen';
import { EcommerceComparisonScreen } from '../screens/EcommerceComparisonScreen';
import { PackageComparisonScreen } from '../screens/PackageComparisonScreen';
import { getRootRoute } from './guards';

import type { MainTabParamList, RootStackParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs(): React.JSX.Element {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="NewInspection" component={NewInspectionScreen} options={{ title: 'New' }} />
      <Tabs.Screen name="Rules" component={RuleLibraryScreen} options={{ title: 'Rules' }} />
      <Tabs.Screen name="History" component={HistoryScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function AppNavigator(): React.JSX.Element {
  const { status } = useAuth();
  const rootRoute = getRootRoute(status);

  return (
    <NavigationContainer>
      {rootRoute === 'Loading' ? (
        <StateView kind="loading" message="Restoring your secure session…" />
      ) : (
        <Root.Navigator screenOptions={{ headerShown: false }}>
          {rootRoute === 'Auth' ? (
            <Root.Screen name="Auth" component={LoginScreen} />
          ) : (
            <>
              <Root.Screen name="App" component={MainTabs} />
              <Root.Screen name="CameraCapture" component={ImageCaptureScreen} />
              <Root.Screen name="SmartScan" component={ImageCaptureScreen} />
              <Root.Screen name="ImageReview" component={ImageReviewScreen} />
              <Root.Screen name="AIProcessing" component={ProcessingScreen} />
              <Root.Screen name="InspectionResult" component={InspectionResultScreen} />
              <Root.Screen name="Declarations" component={DeclarationsScreen} />
              <Root.Screen name="Findings" component={FindingsScreen} />
              <Root.Screen name="FindingDetail" component={FindingDetailScreen} />
              <Root.Screen name="Evidence" component={EvidenceScreen} />
              <Root.Screen name="EvidenceViewer" component={EvidenceViewerScreen} />
              <Root.Screen name="InspectorReview" component={InspectorReviewScreen} />
              <Root.Screen name="ReviewSummary" component={ReviewSummaryScreen} />
              <Root.Screen name="InspectorDecision" component={InspectorDecisionScreen} />
              <Root.Screen name="InspectionDetail" component={InspectionDetailScreen} />
              <Root.Screen name="Report" component={ReportPreviewScreen as never} />
              <Root.Screen name="ReportPreview" component={ReportPreviewScreen as never} />
              <Root.Screen name="RuleLibrary" component={RuleLibraryScreen} />
              <Root.Screen name="LegalRuleDetail" component={LegalRuleDetailScreen} />
              <Root.Screen name="Calibration" component={DeferredScreen} />
              <Root.Screen name="Ecommerce" component={EcommerceComparisonScreen as never} />
              <Root.Screen name="EcommerceComparison" component={EcommerceComparisonScreen} />
              <Root.Screen name="PackageComparison" component={PackageComparisonScreen} />
            </>

          )}
        </Root.Navigator>
      )}
    </NavigationContainer>
  );
}
