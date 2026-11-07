import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ModelView } from '@/components/ModelView';
import { Page } from '@/components/Page';
import { getMarket } from '@/lib/data';

export const revalidate = 300; // re-read the published data every 5 minutes

export default async function Model() {
  const { market, asOf, elasticity, split } = await getMarket();
  return (
    <Page title="Move a Number, See the Threshold">
      {market && asOf
        ? <ModelView market={market} asOf={asOf} elasticity={elasticity} split={split} />
        : <Banner tone="error" title="Model Inputs Did Not Load">The published model inputs did not load, so no threshold is shown rather than a guess.</Banner>}
      <a className="s-query q-own" href="/reproduce/#model">Open the Query</a>
      <Button href="/reproduce/" variant="secondary">Check It Yourself</Button>
    </Page>
  );
}
