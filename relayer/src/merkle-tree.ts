import { createHash } from 'crypto';
import { keccak256 } from 'ethers';

// 1inch Fusion+ compliant secret structure
export interface Secret {
  id: string;
  index: number;
  secret: string;
  hash: string;
  fillPercentage: number;
  createdAt: number;
}

// Merkle leaf for progressive fills
export interface MerkleLeaf {
  index: number;
  secretHash: string;
  fillAmount: string;
  cumulativeAmount: string;
  proof: string[];
}

// Merkle tree node
interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: MerkleLeaf;
}

// Order fragment for partial fills
export interface OrderFragment {
  orderId: string;
  fragmentIndex: number;
  fillPercentage: number;
  secretHash: string;
  merkleProof: string[];
  status: 'pending' | 'filled' | 'expired';
  resolver?: string;
  fillTxHash?: string;
  filledAt?: number;
}

// 1inch compliant partial fill configuration
export interface PartialFillConfig {
  secretsCount: number;
  allowPartialFills: boolean;
  allowMultipleFills: boolean;
  minFillAmount: string;
  maxFillAmount: string;
  fragmentSize: number; // percentage per fragment
}

export class MerkleTreeSecrets {
  private leaves: MerkleLeaf[] = [];
  private root: MerkleNode | null = null;
  private secretsMap: Map<string, Secret> = new Map();

  constructor(private config: PartialFillConfig) {}

  /**
   * Generate secrets for partial fills (1inch compliant)
   * Based on 1inch documentation: "splits the order into equal parts and generates dedicated secrets for each portion"
   */
  generateSecrets(orderId: string, totalAmount: string): Secret[] {
    const secrets: Secret[] = [];
    const secretsCount = this.config.secretsCount;
    const fragmentSize = 100 / secretsCount; // Equal parts

    for (let i = 0; i < secretsCount; i++) {
      const secret = this.generateCryptoSecret();
      const secretHash = this.hashSecret(secret);
      
      const secretObj: Secret = {
        id: `${orderId}_${i}`,
        index: i,
        secret,
        hash: secretHash,
        fillPercentage: fragmentSize,
        createdAt: Date.now()
      };

      secrets.push(secretObj);
      this.secretsMap.set(secretHash, secretObj);
    }

    return secrets;
  }

  /**
   * Create Merkle tree from secrets (1inch Fusion+ compliant)
   * Follows the pattern: "Merkle tree of secrets is implemented for partial fills"
   */
  createMerkleTree(secrets: Secret[], totalAmount: string): string {
    this.leaves = [];
    let cumulativeAmount = BigInt(0);
    const totalAmountBN = BigInt(totalAmount);

    // Generate merkle leaves for each secret
    for (let i = 0; i < secrets.length; i++) {
      const secret = secrets[i];
      const fillAmount = (totalAmountBN * BigInt(secret.fillPercentage)) / BigInt(100);
      cumulativeAmount += fillAmount;

      const leaf: MerkleLeaf = {
        index: i,
        secretHash: secret.hash,
        fillAmount: fillAmount.toString(),
        cumulativeAmount: cumulativeAmount.toString(),
        proof: [] // Will be populated during tree construction
      };

      this.leaves.push(leaf);
    }

    // Build merkle tree
    this.root = this.buildTree(this.leaves);
    
    // Generate proofs for each leaf
    for (let i = 0; i < this.leaves.length; i++) {
      this.leaves[i].proof = this.getProof(i);
    }

    return this.root?.hash || '';
  }

  /**
   * Get merkle proof for a specific fill index
   * Used by resolvers to prove their fill rights
   */
  getProof(leafIndex: number): string[] {
    if (!this.root || leafIndex >= this.leaves.length) {
      return [];
    }

    const proof: string[] = [];
    this.generateProof(this.root, leafIndex, proof, 0, this.leaves.length - 1);
    return proof;
  }

  /**
   * Verify merkle proof for a partial fill
   * Critical for security in partial fills
   */
  verifyProof(
    leafIndex: number,
    secretHash: string,
    proof: string[],
    merkleRoot: string
  ): boolean {
    const leaf = this.leaves[leafIndex];
    if (!leaf || leaf.secretHash !== secretHash) {
      return false;
    }

    const computedHash = this.computeProofHash(leaf, proof);
    return computedHash === merkleRoot;
  }

  /**
   * Get progressive fill requirements
   * Implements: "progressive secret revelation with cryptographic proofs"
   */
  getProgressiveFillRequirements(currentFillPercentage: number): {
    nextSecretIndex: number;
    requiredSecrets: string[];
    availableAmount: string;
  } {
    const nextSecretIndex = Math.floor(currentFillPercentage / this.config.fragmentSize);
    const requiredSecrets: string[] = [];
    
    // Progressive revelation - only reveal secrets up to current fill
    for (let i = 0; i <= nextSecretIndex && i < this.leaves.length; i++) {
      const secret = this.secretsMap.get(this.leaves[i].secretHash);
      if (secret) {
        requiredSecrets.push(secret.hash);
      }
    }

    const availableAmount = nextSecretIndex < this.leaves.length 
      ? this.leaves[nextSecretIndex].cumulativeAmount 
      : '0';

    return {
      nextSecretIndex,
      requiredSecrets,
      availableAmount
    };
  }

  /**
   * Validate partial fill attempt
   * Ensures 1inch compliance and security
   */
  validatePartialFill(
    fragmentIndex: number,
    secretHash: string,
    fillAmount: string,
    currentFilled: string
  ): {
    valid: boolean;
    error?: string;
    nextSecret?: string;
  } {
    const leaf = this.leaves[fragmentIndex];
    if (!leaf) {
      return { valid: false, error: 'Invalid fragment index' };
    }

    if (leaf.secretHash !== secretHash) {
      return { valid: false, error: 'Invalid secret hash' };
    }

    const currentFilledBN = BigInt(currentFilled);
    const fillAmountBN = BigInt(fillAmount);
    const expectedCumulative = BigInt(leaf.cumulativeAmount);

    if (currentFilledBN + fillAmountBN > expectedCumulative) {
      return { valid: false, error: 'Fill amount exceeds fragment limit' };
    }

    // Check if this is progressive (can't skip fragments)
    if (fragmentIndex > 0) {
      const previousLeaf = this.leaves[fragmentIndex - 1];
      if (currentFilledBN < BigInt(previousLeaf.cumulativeAmount)) {
        return { valid: false, error: 'Must fill fragments progressively' };
      }
    }

    const nextSecret = fragmentIndex < this.leaves.length - 1 
      ? this.leaves[fragmentIndex + 1].secretHash 
      : undefined;

    return {
      valid: true,
      nextSecret
    };
  }

  /**
   * Get secrets ready for revelation
   * Implements the 1inch pattern for secret management
   */
  getSecretsReadyForRevelation(currentFillPercentage: number): {
    readySecrets: Secret[];
    pendingSecrets: Secret[];
    nextThreshold: number;
  } {
    const readySecrets: Secret[] = [];
    const pendingSecrets: Secret[] = [];
    const currentIndex = Math.floor(currentFillPercentage / this.config.fragmentSize);

    this.leaves.forEach((leaf, index) => {
      const secret = this.secretsMap.get(leaf.secretHash);
      if (secret) {
        if (index <= currentIndex) {
          readySecrets.push(secret);
        } else {
          pendingSecrets.push(secret);
        }
      }
    });

    const nextThreshold = (currentIndex + 1) * this.config.fragmentSize;

    return {
      readySecrets,
      pendingSecrets,
      nextThreshold
    };
  }

  /**
   * Generate order fragments for resolvers
   * Creates manageable pieces for partial execution
   */
  generateOrderFragments(orderId: string): OrderFragment[] {
    const fragments: OrderFragment[] = [];

    this.leaves.forEach((leaf, index) => {
      const fragment: OrderFragment = {
        orderId,
        fragmentIndex: index,
        fillPercentage: this.config.fragmentSize,
        secretHash: leaf.secretHash,
        merkleProof: leaf.proof,
        status: 'pending'
      };

      fragments.push(fragment);
    });

    return fragments;
  }

  // Private helper methods

  private generateCryptoSecret(): string {
    const randomBytes = createHash('sha256')
      .update(Math.random().toString() + Date.now().toString())
      .digest('hex');
    return `0x${randomBytes}`;
  }

  private hashSecret(secret: string): string {
    return keccak256(Buffer.from(secret.replace('0x', ''), 'hex'));
  }

  private buildTree(leaves: MerkleLeaf[]): MerkleNode | null {
    if (leaves.length === 0) return null;

    // Create leaf nodes
    let nodes: MerkleNode[] = leaves.map(leaf => ({
      hash: leaf.secretHash,
      data: leaf
    }));

    // Build tree bottom-up
    while (nodes.length > 1) {
      const nextLevel: MerkleNode[] = [];

      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = i + 1 < nodes.length ? nodes[i + 1] : left;

        const combinedHash = keccak256(
          Buffer.concat([
            Buffer.from(left.hash.replace('0x', ''), 'hex'),
            Buffer.from(right.hash.replace('0x', ''), 'hex')
          ])
        );

        nextLevel.push({
          hash: combinedHash,
          left,
          right: right !== left ? right : undefined
        });
      }

      nodes = nextLevel;
    }

    return nodes[0];
  }

  private generateProof(
    node: MerkleNode,
    leafIndex: number,
    proof: string[],
    start: number,
    end: number
  ): void {
    if (start === end) return;

    const mid = Math.floor((start + end) / 2);

    if (leafIndex <= mid) {
      if (node.right) {
        proof.push(node.right.hash);
      }
      if (node.left) {
        this.generateProof(node.left, leafIndex, proof, start, mid);
      }
    } else {
      if (node.left) {
        proof.push(node.left.hash);
      }
      if (node.right) {
        this.generateProof(node.right, leafIndex, proof, mid + 1, end);
      }
    }
  }

  private computeProofHash(leaf: MerkleLeaf, proof: string[]): string {
    let hash = leaf.secretHash;

    for (const proofHash of proof) {
      const combined = Buffer.concat([
        Buffer.from(hash.replace('0x', ''), 'hex'),
        Buffer.from(proofHash.replace('0x', ''), 'hex')
      ]);
      hash = keccak256(combined);
    }

    return hash;
  }
}

// Export utility functions for external use
export const MerkleTreeUtils = {
  /**
   * Create merkle leaves from secrets array
   * 1inch compliant helper function
   */
  createLeavesFromSecrets(secrets: string[]): string[] {
    return secrets.map((secret, index) => {
      const secretHash = keccak256(Buffer.from(secret.replace('0x', ''), 'hex'));
      const indexHash = keccak256(Buffer.from(index.toString(), 'utf8'));
      return keccak256(Buffer.concat([
        Buffer.from(indexHash.replace('0x', ''), 'hex'),
        Buffer.from(secretHash.replace('0x', ''), 'hex')
      ]));
    });
  },

  /**
   * Hash lock for single fill (1inch compatibility)
   */
  hashLockForSingleFill(secret: string): string {
    return keccak256(Buffer.from(secret.replace('0x', ''), 'hex'));
  },

  /**
   * Hash lock for multiple fills (1inch compatibility)
   */
  hashLockForMultipleFills(leaves: string[]): string {
    if (leaves.length === 0) return '0x';
    
    let nodes = leaves;
    while (nodes.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < nodes.length; i += 2) {
        const left = nodes[i];
        const right = i + 1 < nodes.length ? nodes[i + 1] : left;
        
        const combined = keccak256(Buffer.concat([
          Buffer.from(left.replace('0x', ''), 'hex'),
          Buffer.from(right.replace('0x', ''), 'hex')
        ]));
        
        nextLevel.push(combined);
      }
      
      nodes = nextLevel;
    }
    
    return nodes[0];
  }
};

export default MerkleTreeSecrets; 