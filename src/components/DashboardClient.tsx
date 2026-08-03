import QueryProvider from './QueryProvider';
import DashboardContainer from './DashboardContainer';
import ErrorBoundary from './shared/ErrorBoundary';

export default function DashboardClient() {
  return (
    <QueryProvider>
      <ErrorBoundary>
        <DashboardContainer />
      </ErrorBoundary>
    </QueryProvider>
  );
}
