// @ts-ignore
import * as fcl from "@onflow/fcl";
// @ts-ignore
import * as type from "@onflow/types";
import Sha3 from "js-sha3";

const lookupDomainByFlownsNameHashSource = `
import Domains from 0xFlownsAddress

// Source: https://github.com/flowns-org/flow-name-service-contracts/blob/main/cadence/scripts/query_domain_info.cdc
pub fun main(nameHash: String): Domains.DomainDetail? {
  let address = Domains.getRecords(nameHash) ?? panic("Domain not exist")
  let account = getAccount(address)
  let collectionCap = account.getCapability<&{Domains.CollectionPublic}>(Domains.CollectionPublicPath)
  let collection = collectionCap.borrow()!
  var detail: Domains.DomainDetail? = nil

  let id = Domains.getDomainId(nameHash)
  if id != nil && !Domains.isDeprecated(nameHash: nameHash, domainId: id!) {
    let domain = collection.borrowDomain(id: id!)
    detail = domain.getDetail()
  }

  return detail
}
`;

const lookupProfileByFindNameSource = `
import FIND, Profile from 0xFindAddress

pub fun main(name: String): Profile.UserProfile? {
    return FIND.lookup(name)?.asProfile()
}
`;

export type FindLink = {
  url: string;
  title: string;
  type: string;
};

export type FindWalletProfile = {
  name: string;
  balance: number;
  accept: string;
  tags: string[];
};

export type FindFriendStatus = {
  follower: string;
  following: String;
  tags: string[];
};

// https://github.com/findonflow/find/blob/main/contracts/Profile.cdc
export type FindUserProfile = {
  findName: string;
  createdAt: string;
  address: string;
  name: string;
  gender: string;
  description: string;
  tags: string[];
  avatar: string;
  links: FindLink[];
  wallets: FindWalletProfile[];
  following: FindFriendStatus[];
  followers: FindFriendStatus[];
  allowStoringFollowers: boolean;
};

// https://github.com/flowns-org/flow-name-service-contracts/blob/main/cadence/contracts/Domains.cdc
export type FlownsDomainDetail = {
  id: string;
  // Address of the owner account.
  owner: string;
  name: string;
  nameHash: string;
  addresses: Record<number, string>;
  texts: Record<number, string>;
  parentName: string;
  // Timestamp of the expiration
  expiredAt: string;
  // Timestamp of the creation date.
  createdAt: string;
};

export type FlowNameRawInfo = {
  flowns: FlownsDomainDetail | null;
  find: FindUserProfile | null;
};

export type FlowAbstractNameInfo = {
  address: string;
  domainName: string;
  twitterUrl?: string;
  websiteUrl?: string;
  name?: string;
  description?: string;
  avatar?: string;
  tags?: string[];
};

export class DomainsService {
  constructor() {
    this.init({
      findAddress: "0x097bafa4e0b48eef",
      flownsAddress: "0x233eb012d34b0070",
    });
  }

  private init(props: { flownsAddress: string; findAddress: string }) {
    fcl
      .config()
      .put("0xFlownsAddress", props.flownsAddress)
      .put("0xFindAddress", props.findAddress);
  }

  public async resolveNameToAddress(name: string): Promise<string | undefined> {
    const { flowns, find } = await this.lookupRawInfosByName(name);
    return flowns?.owner ?? find?.address;
  }

  public async getNameInfo(
    name: string
  ): Promise<FlowAbstractNameInfo | undefined> {
    // TODO: Remove mock data
    // return {
    //   address: "0xde4a0b425de4053e",
    //   domainName: "bart",
    //   name: "Bart",
    //   avatar: "https://avatars.githubusercontent.com/u/36109955?v=4",
    //   twitterUrl: "https://twitter.com/@BartTheDev",
    //   websiteUrl: "https://bartolomej.dev",
    //   tags: ["Developer", "Flowser", "LinkLock", "Supportify"],
    //   description: "Participator of Flow hackathon 2023.",
    // };
    const { find, flowns } = await this.lookupRawInfosByName(name);

    if (!find && !flowns) {
      return undefined;
    }

    // TODO: What are the possible link types?
    const twitterLink = find?.links.find((link) => link.type === "twitter");
    const websiteLink = find?.links.find((link) => link.type === "globe");

    return {
      address: find?.address ?? flowns?.owner!,
      domainName: find?.findName ?? flowns?.name!,
      name: find?.name ?? flowns?.name,
      avatar: find?.avatar,
      // TODO: Read from flowns text records
      twitterUrl: twitterLink?.url,
      websiteUrl: websiteLink?.url,
      tags: find?.tags,
      description: find?.description,
    };
  }

  public async lookupRawInfosByName(name: string): Promise<FlowNameRawInfo> {
    const [flownsResponse, findResponse] = await Promise.allSettled([
      this.lookupDomainByFlownsName(name),
      this.lookupProfileByFindName(name),
    ]);

    return {
      flowns:
        flownsResponse.status === "fulfilled" ? flownsResponse.value : null,
      find: findResponse.status === "fulfilled" ? findResponse.value : null,
    };
  }

  private lookupDomainByFlownsName(name: string): Promise<FlownsDomainDetail> {
    const isFlownsName = name.endsWith(".fn");
    if (!isFlownsName) {
      return Promise.reject("Not a valid .fn name");
    }
    const nameHash = this.flownsNameHash(name);
    return fcl
      .send([
        fcl.script(lookupDomainByFlownsNameHashSource),
        fcl.args([fcl.arg(nameHash, type.String)]),
      ])
      .then(fcl.decode);
  }

  private lookupProfileByFindName(name: string): Promise<FindUserProfile> {
    const isFindName = name.endsWith(".find");
    if (!isFindName) {
      return Promise.reject("Not a valid .find name");
    }
    return fcl
      .send([
        fcl.script(lookupProfileByFindNameSource),
        fcl.args([fcl.arg(name, type.String)]),
      ])
      .then(fcl.decode);
  }

  // Source: https://github.com/flowns-org/flow-name-service-contracts/blob/main/utils/hash.js
  private flownsNameHash(domainName: string) {
    const sha3 = Sha3.sha3_256;
    // Reject empty names:
    let node = "";
    for (let i = 0; i < 32; i++) {
      node += "00";
    }
    if (domainName) {
      let labels = domainName.split(".");

      for (let i = labels.length - 1; i >= 0; i--) {
        let labelSha = sha3(labels[i]);
        node = sha3(node + labelSha);
      }
    }

    return "0x" + node;
  }
}
