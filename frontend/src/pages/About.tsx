export default function About() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1>About permanentspeech</h1>
      <p>
        permanentspeech.com is a permissionless publishing application that allows
        you to permanently inscribe short-form speech onto the Bitcoin blockchain
        using OP_RETURN.
      </p>
      <h2>How it works</h2>
      <ol>
        <li>Write your message (up to 80 bytes)</li>
        <li>Connect your Bitcoin wallet</li>
        <li>Sign the transaction</li>
        <li>Your message is permanently recorded on Bitcoin</li>
      </ol>
      <h2>Why permanence?</h2>
      <p>Once published, your message cannot be edited, deleted, or censored. It exists as long as Bitcoin exists.</p>
      <h2>Non-custodial</h2>
      <p>We never touch your private keys. All transaction signing happens in your wallet.</p>
    </div>
  );
}
