import { parseUnits } from "viem"
import { describe, expect, it } from "vitest"
import { NATIVE_ASSET, REASON_LABELS, ReasonCode, encodePolicy, reasonLabel } from "./policy"

const RECIPIENT_A = "0x1111111111111111111111111111111111111111"
const RECIPIENT_B = "0x2222222222222222222222222222222222222222"
const USDC = "0x3333333333333333333333333333333333333333"

describe("encodePolicy", () => {
  it("scales native (18-dec) and ERC-20 (6-dec) amounts via parseUnits", () => {
    const { limits } = encodePolicy({
      assets: [
        { symbol: "HSK", perTxCap: "1.5", dailyCap: "10" },
        { symbol: "USDC", address: USDC, decimals: 6, perTxCap: "100", dailyCap: "500" },
      ],
    })

    expect(limits[0]).toEqual({
      asset: NATIVE_ASSET,
      perTxCap: parseUnits("1.5", 18),
      dailyCap: parseUnits("10", 18),
    })
    expect(limits[1]).toEqual({
      asset: USDC,
      perTxCap: 100_000000n,
      dailyCap: 500_000000n,
    })
  })

  it("defaults window to one day and marks the covenant active", () => {
    const { config } = encodePolicy({
      assets: [{ symbol: "HSK", perTxCap: "1", dailyCap: "1" }],
    })
    expect(config.active).toBe(true)
    expect(config.windowDuration).toBe(86_400n)
  })

  it("derives allowlist flags from array presence", () => {
    const { config } = encodePolicy({
      assets: [{ symbol: "HSK", perTxCap: "1", dailyCap: "1" }],
      recipients: [RECIPIENT_A, RECIPIENT_B],
    })
    expect(config.recipientAllowlistEnabled).toBe(true)
    expect(config.selectorAllowlistEnabled).toBe(false)
    expect(config.targetAllowlistEnabled).toBe(false)
  })

  it("honors explicit enforce overrides in both directions", () => {
    const { config } = encodePolicy({
      assets: [{ symbol: "HSK", perTxCap: "1", dailyCap: "1" }],
      recipients: [RECIPIENT_A],
      enforce: { recipientAllowlist: false, targetAllowlist: true },
    })
    // recipients present but explicitly disabled
    expect(config.recipientAllowlistEnabled).toBe(false)
    // targets empty but explicitly enabled
    expect(config.targetAllowlistEnabled).toBe(true)
  })

  it("encodes largeAction threshold + timelock, and zeroes them when absent", () => {
    const withLarge = encodePolicy({
      assets: [{ symbol: "HSK", perTxCap: "1", dailyCap: "1000" }],
      largeAction: { threshold: "1000", timelockSeconds: 3600 },
    })
    expect(withLarge.config.largeActionThreshold).toBe(parseUnits("1000", 18))
    expect(withLarge.config.timelockDelay).toBe(3600n)

    const withoutLarge = encodePolicy({
      assets: [{ symbol: "HSK", perTxCap: "1", dailyCap: "1" }],
    })
    expect(withoutLarge.config.largeActionThreshold).toBe(0n)
    expect(withoutLarge.config.timelockDelay).toBe(0n)
  })

  it("rejects an invalid recipient address", () => {
    expect(() =>
      encodePolicy({
        assets: [{ symbol: "HSK", perTxCap: "1", dailyCap: "1" }],
        recipients: ["not-an-address"],
      }),
    ).toThrow()
  })

  it("rejects a non-decimal amount", () => {
    expect(() =>
      encodePolicy({ assets: [{ symbol: "HSK", perTxCap: "1e18", dailyCap: "1" }] }),
    ).toThrow()
  })

  it("requires at least one asset", () => {
    expect(() => encodePolicy({ assets: [] })).toThrow()
  })
})

describe("reasonLabel", () => {
  it("labels every guard reason code", () => {
    for (const code of Object.values(ReasonCode)) {
      expect(reasonLabel(code)).toBe(REASON_LABELS[code])
    }
  })

  it("falls back for an unknown code", () => {
    expect(reasonLabel(99)).toContain("Unknown")
  })
})
