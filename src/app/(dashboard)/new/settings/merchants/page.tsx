import Link from "next/link";
import View from "@/components/settings/MerchantGroupsSettings";
export default function Page() {
  return (
    <>
      <View />
      <p className="nl-footnote">
        Need to correct a merchant?{" "}
        <Link href="/new/transactions">Open transactions →</Link>
      </p>
    </>
  );
}
