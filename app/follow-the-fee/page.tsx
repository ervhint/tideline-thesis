import { Banner } from '@/components/Banner';
import { FeeSplit } from '@/components/FeeSplit';
import { ErrorSwap, RetryButton } from '@/components/ErrorSwap';
import { NumberSheet } from '@/components/NumberSheet';
import { Page } from '@/components/Page';
import { PanelSlot } from '@/components/PanelNote';
import { Rich, Say } from '@/components/Say';
import { getNumbers } from '@/lib/data';
import { EASY } from '@/lib/easy_text';

export const revalidate = 300; // re-read the published data every 5 minutes

// `?state=empty` previews the page with no public swap in this size: the real file with that bucket taken away, through the same view code.
export default async function FollowTheFee({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { fee } = await getNumbers({ emptyFee: (await searchParams).state === 'empty' });
  if (fee.state === 'missing') {
    return (
      <Page title="What a $10,000 Swap Costs" ask={EASY.ask.fee} lead="No figures are shown, because the data did not load.">
        <div className="err-body">
          <Banner tone="error" title="Swaps Did Not Load">The file of realised swaps did not load. Nothing is shown rather than a guess.</Banner>
          <div className="err-actions"><RetryButton>Try Again</RetryButton></div>
        </div>
      </Page>
    );
  }
  if (fee.state === 'empty') {
    return (
      <Page title="What a $10,000 Swap Costs" ask={EASY.ask.fee} lead={fee.lead} easyLead={fee.easyLead}>
        <div className="split-foot">
          <Banner tone="neutral" title="No Public Swaps to Split"><Say pro={fee.body} easy={<Rich text={fee.easyBody} />} /></Banner>
        </div>
        <div className="split-foot">
          <PanelSlot pick={['swapsText', 'quoteText']} />
        </div>
      </Page>
    );
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lastGood = fee.asOf ? `${Number(fee.asOf.slice(8, 10))} ${MONTHS[Number(fee.asOf.slice(5, 7)) - 1]} ${fee.asOf.slice(0, 4)}` : null;
  return (
    <Page title="What a $10,000 Swap Costs" ask={EASY.ask.fee} lead={<ErrorSwap normal={<Say pro={fee.lead} easy={<Rich text={fee.easyLead} />} />} error="No figures are shown, because the data did not load." />}>
      <ErrorSwap
        error={
          <div className="err-body">
            <Banner tone="error" title="Swaps Did Not Load">
              {`The file of realised swaps did not load. Nothing is shown rather than a guess.${lastGood ? ` The last good figures cover the chain days to ${lastGood}.` : ''}`}
            </Banner>
            <div className="err-actions">
              <RetryButton>Try Again</RetryButton>
              {lastGood && <RetryButton>{`Show Last Good Figures (to ${lastGood})`}</RetryButton>}
            </div>
          </div>
        }
        normal={<>
      <div className="s2-grid">
        <div className="glass split num">
          <p className="s-title"><Say pro={`Of the ${fee.total}, Where It Goes`} easy={fee.easyTitle} /></p>
          <FeeSplit fee={fee} />
          <a className="s-query" href="/reproduce/#fee-trace">Open the Query</a>
        </div>
        <NumberSheet
          card={fee.card}
          href="/reproduce/#fee-trace"
          explain={fee.explain}
          easyText={fee.card.easy}
          easyExplain={fee.easyExplain}
          query={fee.query}
          easyQuery={fee.easyQuery}
        />
      </div>
      <div className="split-foot">
        <Banner tone="neutral" title={<Say pro="Unexplained Part Is Shown, Never Hidden" easy={EASY.leftOutTitle} />}><Say pro={fee.bannerText} easy={fee.easyBanner} /></Banner>
      </div>
      <div className="split-foot">
        <PanelSlot pick={['swapsText', 'quoteText']} />
      </div>
        </>}
      />
    </Page>
  );
}
