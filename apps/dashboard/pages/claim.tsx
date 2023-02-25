import { MembershipCheckout } from "@membership/client";
import { useState } from "react";

export default function ClaimMembership() {
  const [adminAddress, setAdminAddress] = useState<string>();
  const [membershipDefinitionId, setMembershipDefinitionId] =
    useState<number>();
  const [isOpenModal, setIsOpenModal] = useState(false);
  return (
    <div>
      <h3>Claim membership</h3>
      <label>
        Admin address
        <input
          value={adminAddress}
          onChange={(e) => setAdminAddress(e.target.value)}
        />
      </label>
      <br />
      <label>
        Membership definition ID
        <input
          type="number"
          value={membershipDefinitionId}
          onChange={(e) => setMembershipDefinitionId(e.target.valueAsNumber)}
        />
      </label>
      <br />
      <button onClick={() => setIsOpenModal(true)}>Claim</button>
      {adminAddress && membershipDefinitionId !== undefined && (
        <MembershipCheckout
          isOpenModal={isOpenModal}
          onCloseModal={() => setIsOpenModal(false)}
          membershipDefinitionId={membershipDefinitionId}
          adminAddress={adminAddress}
        />
      )}
    </div>
  );
}
