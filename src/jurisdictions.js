const jurisdictions = {
  'IN': {
    name: 'India',
    consumer: {
      disclaimer: 'General information for Indian consumer disputes. State rules, limitation periods, and forum jurisdiction must be independently verified.',
      sources: [
        { id: 'in-cpa-2019', title: 'Consumer Protection Act, 2019', authority: 'India Code', url: 'https://www.indiacode.nic.in/handle/123456789/15256' },
        { id: 'in-nch', title: 'National Consumer Helpline', authority: 'Department of Consumer Affairs', url: 'https://consumerhelpline.gov.in/' },
        { id: 'in-ejagriti', title: 'e-Jagriti', authority: 'Department of Consumer Affairs', url: 'https://e-jagriti.gov.in/' }
      ],
      escalation: ['National Consumer Helpline', 'Appropriate Consumer Commission through e-Jagriti', 'Independent legal professional']
    }
  },
  'US-CA': {
    name: 'California, United States',
    consumer: {
      disclaimer: 'General information only. Federal, state, county, contractual, and arbitration rules may apply.',
      sources: [
        { id: 'ca-dca', title: 'California Department of Consumer Affairs', authority: 'State of California', url: 'https://www.dca.ca.gov/consumers/' },
        { id: 'ftc-consumer', title: 'Consumer Advice', authority: 'U.S. Federal Trade Commission', url: 'https://consumer.ftc.gov/' }
      ],
      escalation: ['Merchant complaint process', 'California Department of Consumer Affairs', 'Independent attorney or small claims advisor']
    }
  },
  'GB-ENG': {
    name: 'England and Wales',
    consumer: {
      disclaimer: 'General information only. Contract terms and the facts of the purchase affect available remedies.',
      sources: [
        { id: 'uk-cra', title: 'Consumer Rights Act 2015', authority: 'UK Legislation', url: 'https://www.legislation.gov.uk/ukpga/2015/15/contents' },
        { id: 'citizens-advice', title: 'Consumer advice', authority: 'Citizens Advice', url: 'https://www.citizensadvice.org.uk/consumer/' }
      ],
      escalation: ['Trader complaint process', 'Citizens Advice consumer service', 'Alternative dispute resolution or independent solicitor']
    }
  }
};

export function getJurisdiction(code = 'IN') {
  const result = jurisdictions[code];
  if (!result) throw new Error('Unsupported jurisdiction. Choose IN, US-CA, or GB-ENG.');
  return structuredClone(result);
}

export function listJurisdictions() {
  return Object.entries(jurisdictions).map(([code, value]) => ({ code, name: value.name }));
}
