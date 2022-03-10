import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumberish, Signature, ethers, ContractReceipt } from 'ethers';
import { CometContext } from './CometContext';
import { AddressLike, resolveAddress } from './Address';

const types = {
  Authorization: [
    { name: 'owner', type: 'address' },
    { name: 'manager', type: 'address' },
    { name: 'isAllowed', type: 'bool' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
};

function floor(n: number): bigint {
  return BigInt(Math.floor(n));
}

export default class CometActor {
  name: string;
  signer: SignerWithAddress;
  address: string;
  context: CometContext;
  info: object;

  constructor(
    name: string,
    signer: SignerWithAddress,
    address: string,
    context: CometContext,
    info: object = {}
  ) {
    this.name = name;
    this.signer = signer;
    this.address = address;
    this.context = context;
    this.info = info;
  }

  static fork(actor: CometActor, context: CometContext): CometActor {
    return new CometActor(actor.name, actor.signer, actor.address, context, actor.info);
  }

  async getEthBalance() {
    return this.signer.getBalance();
  }

  async sendEth(recipient: AddressLike, amount: number) {
    let tx = await this.signer.sendTransaction({
      to: resolveAddress(recipient),
      value: floor(amount * 1e18),
    });
    await tx.wait();
  }

  async allow(manager: CometActor, isAllowed: boolean): Promise<ContractReceipt> {
    let comet = await this.context.getComet();
    return await (await comet.connect(this.signer).allow(manager.address, isAllowed)).wait();
  }

  async pause({
    supplyPaused = false,
    transferPaused = false,
    withdrawPaused = false,
    absorbPaused = false,
    buyPaused = false,
  }): Promise<ContractReceipt> {
    let comet = await this.context.getComet();
    return await (
      await comet
        .connect(this.signer)
        .pause(supplyPaused, transferPaused, withdrawPaused, absorbPaused, buyPaused)
    ).wait();
  }

  async transferAsset({ dst, asset, amount }): Promise<ContractReceipt> {
    let comet = await this.context.getComet();
    return await (await comet.connect(this.signer).transferAsset(dst, asset, amount)).wait();
  }

  async transferAssetFrom({ src, dst, asset, amount }): Promise<ContractReceipt> {
    let comet = await this.context.getComet();
    return await (await comet.connect(this.signer).transferAssetFrom(src, dst, asset, amount)).wait();
  }

  async signAuthorization({
    manager,
    isAllowed,
    nonce,
    expiry,
    chainId,
  }: {
    manager: string;
    isAllowed: boolean;
    nonce: BigNumberish;
    expiry: number;
    chainId: number;
  }): Promise<Signature> {
    let comet = await this.context.getComet();
    const domain = {
      name: await comet.name(),
      version: await comet.version(),
      chainId: chainId,
      verifyingContract: comet.address,
    };
    const value = {
      owner: this.address,
      manager,
      isAllowed,
      nonce,
      expiry,
    };
    const rawSignature = await this.signer._signTypedData(domain, types, value);
    return ethers.utils.splitSignature(rawSignature);
  }

  async allowBySig({
    owner,
    manager,
    isAllowed,
    nonce,
    expiry,
    signature,
  }: {
    owner: string;
    manager: string;
    isAllowed: boolean;
    nonce: BigNumberish;
    expiry: number;
    signature: Signature;
  }): Promise<ContractReceipt> {
    let comet = await this.context.getComet();
    return await (await comet
      .connect(this.signer)
      .allowBySig(owner, manager, isAllowed, nonce, expiry, signature.v, signature.r, signature.s)).wait();
  }

  async show() {
    return console.log(`Actor#${this.name}{${JSON.stringify(this.info)}}`);
  }

  async withdrawReserves(to: CometActor, amount: number): Promise<ContractReceipt> {
    let comet = await this.context.getComet();
    return await (await comet.connect(this.signer).withdrawReserves(to.address, amount)).wait();
  }
}
