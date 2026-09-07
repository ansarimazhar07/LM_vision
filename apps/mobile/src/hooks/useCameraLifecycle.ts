import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { shouldResetCameraForAppState } from '../ui/audit';

/** Keeps camera-only state scoped to the focused camera route. */
export function useCameraLifecycle(onReset: () => void): void {
  const resetRef = useRef(onReset);
  resetRef.current = onReset;

  const reset = useCallback(() => resetRef.current(), []);

  useFocusEffect(
    useCallback(() => {
      reset();
      return reset;
    }, [reset]),
  );

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (shouldResetCameraForAppState(nextState)) reset();
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [reset]);
}
