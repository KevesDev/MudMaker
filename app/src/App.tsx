import type { ReactElement } from "react";
import { HomeWorkspace } from "./home/HomeWorkspace";
import { productionDependencies, type HomeDependencies } from "./home/homeDependencies";
import { InstallDamaged } from "./home/StartupFailure";
import { LoadingAnnouncement, StartupLoading } from "./home/StartupLoading";
import { useStartup } from "./home/useStartup";

export function App({ dependencies = productionDependencies }: { readonly dependencies?: HomeDependencies }) {
  const { state, attempt, retry } = useStartup(dependencies);
  let screen: ReactElement;
  if (state.phase === "checking") {
    screen = <StartupLoading />;
  } else if (state.report.registry === null) {
    screen = <InstallDamaged />;
  } else {
    screen = <HomeWorkspace report={state.report} dependencies={dependencies} retry={retry} focusHeading={attempt > 1} />;
  }
  return (
    <>
      {screen}
      <LoadingAnnouncement checking={state.phase === "checking"} />
    </>
  );
}
