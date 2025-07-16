# 1. Introduction

## Introduction

This documentation covers the implementation of the 1inch Fusion+ Cross-Chain Swap system, including order creation, bridging logic, relayer setup, and recovery mechanics.


---


# 2. Orders


---


# 3. Announcement Phase

## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Introduction
1inch Fusion+ (intent-based atomic cross-chain swaps)
info
For a comprehensive technical overview, refer to the
1inch Fusion+ whitepaper
.
The 1inch Fusion+ API is a powerful solution for secure and efficient cross-chain swaps in DeFi that uses a creative architecture of Dutch auctions and automated recovery, all without relying on a single centralized custodian.
Phases of a Fusion+ swap
The process typically involves two main participants: the maker, who initiates the swap, and the resolver, who completes it; and has three phases. However, if any problems arise, there is an optional 4th
recovery phase
that can be used as a last resort.
Phase 1: Announcement
The maker initiates the process by signing a 1inch Fusion+ order and broadcasting it to 1inch. This signals their intent to execute a cross-chain swap and sets the process in motion.
The order is distributed to all resolvers, triggering a
Dutch auction
. Resolvers compete by offering progressively better prices as the auction continues until a resolver locks in the order by initiating an escrow on the source chain.
Phase 2: Deposit
The winning resolver deposits the maker's assets into an escrow contract on the source chain, and then deposits the corresponding assets into an escrow on the destination chain. Both escrows are linked by a secret hash, ensuring that assets can only be unlocked once the swap is completed. A small safety deposit is also assigned to each escrow, incentivizing the resolver to successfuly complete the order.
Phase 3: Withdrawal
Once both escrows are verified by the relayer, the secret is revealed, allowing the resolver to unlock the assets on the destination chain for the maker. The resolver then uses the same secret to retrieve their newly acquired assets on the source chain, finalizing the swap.
Optional phase: Recovery
In the event of a failed swap (e.g., if a party becomes unresponsive), the protocol includes a recovery mechanism. After the timelock expires, any resolver or any participating entity can cancel the swap and return the assets to their original owners. The safety deposit in each escrow is transfered to any resolver who steps in to complete the swap during this phase.
The partial fill feature
When an order is 100% filled, a single secret is used to finalize the transaction between two parties. However, when an order is only partially filled by different resolvers, revealing the secret to the public could let others claim the remainder of the order without completing their part.
To solve this, a Merkle tree of secrets is implemented for partial fills, which splits the order into equal parts and generates dedicated secrets for each portion of swap.
For example, if an order is divided into four parts, the first secret is used for the first 25%, the second for 50%, and so on. If a participant fills a part of the order, the next participant uses the corresponding secret based on the current progress to continue filling the order. This ensures that each participant can only fill their portion without exposing the rest of the order.
In the example image below, the 1st secret is used for the initial 0-20% fill, marking the first stage of the order. Secrets 2 and 3 are not used because the order skips directly from 20% to 80%, bypassing the ranges where these secrets would apply. The 4th secret is then used to fill the order from 20% to 80%, covering this larger portion. Finally, the 5th secret is used to complete the final 80-100% of the order, ensuring that the entire order is securely and progressively filled.
API reference
For detailed information about each endpoint, refer to the Fusion+ API
Swagger section
.
Previous
Overview
Next
Get cross chain swap active orders
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Terms of Use for Resolvers
Last updated
: 16th of June, 2025
Effective from
: 17th of June, 2025
These 1inch Network Terms of Use for Resolvers replace and supersede the previous version titled “1inch Fusion Mode Terms of Use for Resolvers.” This revised version extends the scope to include all Resolver activities across the 1inch Network, including the use of 1inch Fusion Mode and Limit Order execution.
These Terms of Use and any terms and conditions incorporated herein by reference, including all annexes, (collectively, the “
1inch Network Terms for Resolvers
”, “
Terms
”) govern the activities and obligations of any individual or entity acting as the Resolver, as defined below (“you”, “your”). The
1inch Network Interface Terms of Use
and
1inch Network Interface Privacy Policy
are also applicable to your activities as a Resolver.
Please read these Terms carefully. By registering and/or acting in your capacity as the Resolver, you acknowledge that you have read, understood, and accepted all the provisions set out below or incorporated herein by reference. If you do not agree with any provision of these Terms, you must refrain from acting as a Resolver.
1. Definitions
“Delegate” refers to the st1INCH Token Holder that delegates the Unicorn Power to the Resolver.
“1inch Escrow Contracts” refers to the smart contracts deployed by 1inch that facilitates securing assets in escrow containers for origin and destination chains (escrow factory contract, source escrow contract, and destination escrow contract) that are used for atomic intent-based orders settlement. 1inch Escrow Contracts are the element of the protocol used for cross-chain functionality (1inch Fusion+).
“1inch Fusion Mode” refers to a gasless swap feature that is powered by the 1inch Swap Engine (partially based on 1inch Aggregation Router, 1inch Limit Order Protocol) and accommodated by a set of open-source smart contracts.
“1inch Limit Order Contract” refers to the
AggregationRouterV6
smart contract (with the exception for zkSync router address) or future versions deployed by 1inch and used for limit orders settlement. 1inch Limit Order Contract is an element of the 1inch Limit Order Protocol.
“1inch Relayer” refers to the backend service that contains data (e.g. secret hash, token type and amount, target address, timelock specifications) on the Fusion Orders available for filling by the Resolver.
“1inch Quoter” refers to the backend service that prepares the information to build the Fusion Order’s Dutch auction, visualized as a curve, which determines the amount the Resolver must send to the Maker in each given block.
“st1INCH Token” refers to the staked governance and utility token of the 1inch Network.
“Block Builder” refers to a miner (or validator), any individual or legal entity that collects, verifies, and arranges the transaction into a new block to be added to the blockchain.
“Gas Fee” refers to the total amount of the monetary fee to be paid to fill the Order (regardless of whether the Order has been filled or not) which is calculated as the units of gas used (limit) multiplied by the Gas Price: Gas Fee = Gas Units used * Gas Price.
“Gas Price” refers to the value for each unit of gas which is determined by the following components: (a) the “Base Fee” and the “Priority Fee” where the Base Fee is the value calculated by blockchain network consensus algorithm based on the size of the previous block in proportion to the targeted size of the pending block, while the Priority Fee is an additional fee on top of the Base Fee to incentivize the block builders; or (b) for transactions without Priority Fee - the “Median Gas Price in the Block” that refers to the median value of all gas prices included within the block.
“Gas Units” refers to the amount of computational resources required to fill the Order by the Resolver.
“Maker” refers to anybody who accesses or uses the 1inch Network Interface to initiate the Order without paying the Gas Fee.
“Order” refers to a gasless swap request submitted by the Maker as an intent-based swap that is technically formed through 1inch Limit Order Contract and a set of smart contracts that enables onchain interactions (“Fusion Order”) or limit order (“Limit Order”) to be filled by the Resolver.
“Resolver”, “Taker” refers to any individual or legal entity that fills (partially or fully) the Order, including the Whitelisted Resolver, the Permissioned Proxy, and any other Resolver that is contributing in any capacity to fill the Orders by such Permissioned Proxy.
“Permissioned Proxy” refers to the Whitelisted Resolver that meets eligibility criteria by uniting the Unicorn Power and fills the Order by facilitating the collection of data from other Resolvers involved.
“Whitelisted Resolver” refers to the Resolver that has been registered and whitelisted to fill the Order.
“Unicorn Power” refers to the unit that is determined by the ratio of the st1INCH Token and its lock period and enables participation in the 1inch Network governance, including delegation to the Resolvers.
All the terms used in this Section are intended only for the purposes of these Terms. All remaining terms should be interpreted according to the
1inch Network Interface Terms of Use
.
2. Resolver Access to Order Filling (Execution)
By registering and/or acting as a Resolver, you are granted access to fill (execute) the Fusion Orders and/or the Limit Orders, submitted by the Maker via the 1inch Network Interface.
Please note that we only provide you with access to the relevant interface and neither have control over your interactions with the blockchain nor encourage you to perform any. Any interaction performed by you as the Resolver remains your sole responsibility. We do not encourage or solicit any particular use of the smart contracts and disclaims any liability arising from such interactions.
Programmatic Costs. Resolvers expressly acknowledge and agree that the functionality to fill the Fusion Orders and/or the Limit Orders may involve programmatic costs on the protocol level and/or embedded within the underlying smart contracts. These costs may be automatically calculated, applied, and deducted from transaction value flows during the Order filling (execution). All such cost interactions are governed exclusively by the logic and terms of the deployed smart contracts. Costs assessed in this manner are deemed final and non-refundable. By participating, the Resolver expressly and irrevocably acknowledges and accepts that, once processed through the smart contracts, all associated costs are conclusively transferred. Such transfers are immutable and cannot be reversed, canceled, or reclaimed under any circumstances.
The Resolver acknowledges and agrees that costs may fluctuate between different orders and over time, due to factors such as market price volatility, validator behavior changes, and adjustments to auction parameters. We make no representations, warranties, or guarantees concerning the stability, predictability, or consistency of any costs incurred. The Resolvers are solely responsible for assessing, understanding, and monitoring the implications of applicable costs on their strategies and overall performance.
The costs parameters, including, without limitation, to the cost structures, rates, and related mechanisms, may be modified, updated, or deprecated at any time, with or without prior notice. It is the sole responsibility of the The Resolver to remain informed of any such changes by monitoring relevant
governance proposals, voting outcomes, and/or protocol-related announcements. We assume no duty to notify Resolvers individually of any cost-related modifications and disclaims any liability arising from a Resolver’s failure to remain apprised of such developments.
3. Eligibility
By registering and/or acting as the Resolver, you acknowledge and confirm that you meet all the conditions set forth herein:
You have the full right, power, and authority to agree to the Terms.
You are not located in, under the control of, or a national, citizen, or resident of any Prohibited Localities and/or subject to the Sanctions Lists as defined in the
1inch Network Interface Terms of Use
.
You are not impersonating any other person or otherwise concealing your identity.
You do not use any software or networking techniques, including the use of a Virtual Private Network (VPN) to modify your internet protocol address or otherwise bypass the restrictions.
You are a sophisticated user and possess the necessary knowledge, skills, and experience to act as the Resolver. Your activities as the Resolver and/or participation in filling the Orders are entirely at your own risk.
You comply with all other eligibility requirements set forth in the
1inch Network Interface Terms of Use
.
You will not act as the Resolver if any applicable laws in your country prohibit you from doing so in accordance with these Terms.You are compliant with all laws and regulations applicable to you as the Resolver.
Should we determine that you no longer meet any of these eligibility conditions, we reserve the right, at our sole discretion and upon reasonable notice when required, to suspend or terminate your status as the Resolver.
4. Compliance
Verification. In order to become the Resolver, you must complete the verification procedure. The verification procedure aims to ensure that the Resolvers are safe and compliant actors.
The verification involves completing an identifying Know Your Client (KYC) / Know Your Business (KYB) questionnaire to verify your identity and determine your legal eligibility. You undertake to promptly provide all required information, including supporting documentation and other evidence, as may be reasonably requested. If you do not provide the required information and/or identifying documents, you will not be able to operate as the Resolver.
Please note that you are solely responsible for the accuracy and completeness of the data provided. If any information and/or identifying documents change, you must inform the 1inch Network representative at
foundation@1inch.io
without delay. You may be required to complete the verification process again.
You understand that the amount of information requested to provide as part of the verification procedure may be subject to change over time and that you may at a later point in time be required to provide additional documents and/or information.
The data is collected to comply with applicable anti-money laundering, anti-terrorist financing, fraud prevention, sanctions laws, and regulations. This data is securely maintained and disclosed only when permitted by law. For more information on how your personal data is processed please read
1inch Network Interface Privacy Policy
.
Wallet Address Screening
. Publicly available information may be used to monitor potential bad actors and assess the risks associated with illicit or non-compliant activities, or other potential threats within the blockchain networks. No additional personal data is collected to perform such compliance
assessment. Such risk assessment services may be provided by the third-party providers.
Third-Party Providers
. Please note that verification procedures and wallet address screening are provided by third-party providers. You acknowledge and understand that the results and outcomes lie in the sole discretion of the third-party provider. We have no control over or connection to the services of any third-party providers, thus we are not and cannot be responsible for the accuracy of the information or the services of such providers. The services of such third-party providers are governed by their respective terms of use, please read them carefully.
5. Registration
By registering as the Resolver, you acknowledge, warrant, and agree that:
You acknowledge and accept full responsibility for your decision to act as the Resolver, including conducting your own assessment of any and all risks associated with filling (execution) of the Orders.
You act as the Resolver entirely at your own risk. The 1inch Network Interface, including your access and/or use of the 1inch Fusion Mode, is provided “as is” without any warranties or representations, whether express or implied, regarding the security, reliability, functionality, or continued availability of the underlying code. There is no guarantee that access to the 1inch Network Interface, including your access and/or use of the 1inch Fusion Mode, will be uninterrupted, timely, or secure.
Registration as a Resolver or inclusion on the Whitelisted Resolver list does not guarantee access to fulfillment of any Order. Your access may be restricted, delayed, or unavailable at any time and for any reason, without notice.
You accept that any fees, costs, or expenses associated with your activities as the Resolverare your responsibility unless otherwise specified.
You are responsible for ensuring your activities as the Resolver complies with local laws, regulations, and ordinances in your jurisdiction.
You pledge not to engage in activities that could potentially harm, overload, or compromise the infrastructure or integrity of the 1inch Network Interface, including your access and/or use of the 1inch Fusion Mode.
You understand that any violation of these Terms may result in your removal from the list of the Resolvers, including termination of the Resolver whitelisting status, without prior notice.
6. Whitelisting
Eligibility Threshold
. In order to become the Whitelisted Resolver, you must qualify for the whitelist. The whitelist is dynamically maintained based on the Unicorn Power delegation threshold. To be eligible for the whitelist, you must have received delegations equating to 5% or more of the total Unicorn Power in the network (“
Eligibility Threshold
”). The whitelist is a maximum limit of ten (10) resolvers.
Dynamic Whitelist
. The dynamic nature of the whitelist means that the Resolver's eligibility may evolve over time due to changes in the Unicorn Power distribution. Should you as the Resolver no longer meet the Unicorn Power delegation threshold, you may be automatically removed from the list of the Whitelisted Resolvers.
From time to time the whitelist criteria and the maximum number of resolvers on the whitelist may be modified, and such changes will be communicated to the Resolvers community in advance.
To complete the whitelisting process, the Resolver that passed the verification procedure shall undergo registration in the whitelist smart contract deployed by the 1inch Network. Please note that updates to the whitelist smart contract may occur periodically. We will reasonably ensure but have no obligation to communicate any such modifications in advance.
Please note that inclusion in the whitelist is not guaranteed solely by meeting the Unicorn Power delegation threshold. The Resolver shall ensure full compliance with these Terms, successfully complete the verification and registration process, as described above. We reserve the right to remove the Resolver from the whitelist if the Whitelisted Resolver fails to comply with any provision of the Terms.
7. Permissioned Proxy
Eligible Resolvers are able to unite their Unicorn Power to meet the eligibility criteria for registering the Whitelisted Resolver that will act as a permissioned proxy, facilitating collection of data from Resolvers participating in filling the Orders. The Resolver chosen to act as the permissioned proxy shall undergo a whitelisting procedure according to these Terms.
Contributing to filling the Orders by the Permissioned Proxy is subject to compliance with the Terms. By registering as the Whitelisted Resolver, the Permissioned Proxy is obliged to ensure that each Resolver contributing in any capacity to fill the Orders by the Permissioned Proxy complies with these Terms, including the eligibility criteria as set forth in Section 3 of these Terms.
Should any Resolver involved fail to comply with these Terms, such failure may be deemed as the failure by the Permissioned Proxy to comply with these Terms and may result in the Permissioned Proxy’s removal from the whitelist.
The Resolvers acknowledge that their participation in the Permissioned Proxy is subject to arrangements defined by the Resolvers involved. We expressly disclaim any influence, control, or obligation over the decisions, functions and/or results of the Permissioned Proxy’s operations. We assume no liability for collaborative decisions made by the Resolvers within the Permissioned Proxy framework.
8. Use of the 1inch Fusion Mode
This Section outlines specific provisions regarding the Resolver’s interaction with the 1inch Fusion Mode, however, not exhaustive. Other terms related to the use of the 1inch Fusion Mode can be found in the other sections of these Terms. Please ensure that you thoroughly review the entire Terms for comprehensive understanding.
The 1inch Fusion Mode. The 1inch Fusion Mode is a gasless swap feature that is powered by the 1inch Swap Engine (partially based on 1inch Aggregation Router, 1inch Limit Order Protocol) and accommodated by a set of open-source smart contracts. The 1inch Fusion Mode may also incorporate ancillary products or features introduced to support interface development, enhancement, and user experience optimization. These supplementary elements, which may serve informational, security, or other auxiliary purposes, are not intended to modify or alter the primary functionality of the 1inch Fusion Mode as described above.
Cross-Chain Functionality (1inch Fusion+). This subsection describes specific terms with respect to the cross-chain functionality that operates on top of the 1inch’s existing intent-based protocols, facilitated by the 1inch Escrow Contracts, as defined above.
To initiate a transaction using the cross-chain functionality, the Maker initiates a Fusion Order by signing and issuing the order using the hash of a secret value sent to the 1inch Network, signaling their intent to make a cross-chain swap. Execution of all deposit and withdrawal operations within the cross-chain functionality is performed by the Taker.
Cross-chain functionality also introduces safety deposit mechanics and recovery phase as a precautionary measure. When a Resolver deposits assets into the escrow contract, they must include an additional amount of the native asset of the chain (the “Safety Deposit”). The Safety Deposit is allocated to the executor of any subsequent withdrawal or cancellation transactions.
In cases where assets are withdrawn on the source chain escrow, but canceled on the destination chain escrow, the Resolver must return the Maker's funds on the source chain. This requirement is monitored by the 1inch technical team, as defined below, to additionally notify the Resolvers of the required actions. The Resolver shall perform these actions without any delay. Refusal to do so is subject to the Restriction Measures, as described below.
Priority Fee Limitations
. The 1inch Fusion Mode employs limits on the Priority Fees for the Fusion Orders, including through the predicate (“Fusion Order Predicate”). The following limitations are applicable, irrespective of the use of the Fusion Order Predicate:
For blocks where the Base Fee is <10.6 gwei, the Priority Fee is capped at 70% of the Base Fee;
For blocks with the Base Fee ranges between 10.6 gwei and 104.1 gwei, the Priority Fee is capped at 50% of the Base Fee;
For blocks where the Base Fee is >104.1 gwei, the Priority Fee is capped at 65% of the Base Fee.
Restriction Measures
. Any action aimed at circumventing the Priority Fee Limitations, intentionally altering the transaction order within the block, and/or otherwise abusing the Orders filling process, constitutes a breach of these Terms, including, but not limited to:
Bypassing the Priority Fee Limitations as defined above;
Making direct payments to the Block Builder’s coinbase address (i.e. block.coinbase.transfer(amount);
Deliberate actions to manipulate transaction order within the block; and/or
Bundling with non-related transactions.
Given the evolving nature of the 1inch Fusion Mode, this list is not intended to be exhaustive. Any breach identified by the technical team responsible for maintaining the 1inch Fusion Mode (the “1inch technical team”) will be subject to the outlined restriction measures. We reserve the right to determine and address any breach at our sole discretion, enforcing the restrictions accordingly.
Upon the first breach identified, the Resolver will immediately receive a warning notice sent from the analytics team supporting the 1inch Fusion Mode (the “1inch analytics team”) via the previously provided by the Resolver contacts and other available private means of communication. Subsequent violations shall result in restrictions on processing the Orders within the 1inch Fusion Mode based on the frequency of such breaches. The restriction measures mean blocking the Resolver from processing the Orders for the specific period determined by the cumulative count of breaches as of the date of the latest breach identified as follows:
Upon a second breach, the Resolver shall be blocked from processing the Orders for a duration of one (1) day;
Upon a third breach - for a duration of seven (7) days;
Upon a fourth breach - for a duration of thirty (30) days;
Upon a fifth breach - for a duration of three-hundred sixty-five (365) days.
The restriction measures are enforced by the representative of the 1inch technical team. In case of any subsequent breach, the following team will promptly notify the Resolver regarding the applicable restriction measures via the previously provided by the Resolver contacts and other available private means of communication.
We reserve the right to determine the fact, count, and sequence of breaches at our sole discretion. The count of breaches begins consecutively starting from the date of the first violation identified. The restrictions shall be effective immediately upon their technical implementation.
9. The Resolver’s Exit
As the Resolver, you have the right to voluntarily terminate your status of the Resolver at any time for any reason by contacting us. If you choose to exit, you shall inform the 1inch Network support team at
support@1inch.io
about your intention to exit within fourteen (14) days prior to the intended exit date.
If you act as the Permissioned Proxy you are required to notify those Resolvers involved in the Permissioned Proxy about your exit within the same 14-day period.
The exit date is determined as 14 days following the next day of notification to the 1inch Networksupport team. For instance, if the Resolver informs the 1inch Network support team about the intention to exit on September 1st, the Resolver's Whitelisting status will be revoked on September 15th.
Upon the exit date, the Resolver's functionality will be disabled, and the Resolver’s whitelisting status (if applicable) will be revoked. Consequently, such Resolver will no longer be considered active.
Incentive Programs (Farms)
. In the event of the Resolver’s exit or any other case when the Resolver’s whitelist status is terminated, the Resolver’s commitment within the farm remains binding according to the initially defined timing schedule. Therefore, in case of exiting or experiencing whitelist status termination, the exiting Resolver shall retain the created incentives in the farm. Such Resolver must ensure that the Delegates who have previously delegated their voting power to that Resolver are able to claim the incentives from the Resolver at any time after such Resolver's exit.
Notification on Non-Active Status
. Information about the non-active status of the resolver will be prominently displayed on the list of the Resolvers. The Delegates are strongly advised to refrain from using non-active resolvers. Instead, the Delegates are encouraged to consider and interact with the list of active Whitelisted Resolvers. Resolvers should be a pro-active part of such notifications.
10. Exclusive Resolver API
The Resolver may be exclusively selected to fill the Fusion Order at the beginning of the Fusion Order’s Dutch auction as vetted by 1inch from time to time. In order to benefit from the Exclusive Resolver API functionality, the Resolver shall provide the 1inch technical team with the Resolver’s API endpoint developed in accordance with the Exclusive Resolver API documentation and/or any necessary credentials provided by the 1inch technical team.
The Resolver’s use of the Exclusive Resolver API functionality is subject to the Service Level Agreement detailed in Annex A of these Terms.
The Resolver hereby grants 1inch with a limited, non-exclusive, world-wide, non-sublicensable and non-transferable license to the Resolver's API endpoint solely for the purpose of and to the extent necessary for the use of the Exclusive API Resolver functionality, as set forth herein, if applicable.
11. Incentive Programs
From time to time we may introduce various incentive programs designed to incentivize active participation by the Resolvers. The specific details and terms of each incentive program, including eligibility criteria, and duration, will be communicated in advance. We reserve the right to modify, update, or terminate these incentive programs at its sole discretion with prior notice.
12. Disclaimers
By registering and/or acting as the Resolvers, you acknowledge and agree that:
Your activities as the Resolver and/or participation in filling the Orders is undertaken at your own risk. To the fullest extent permitted by applicable law, in no event shall we, or any of our affiliates, officers, directors, employees, agents, or representatives shall not be liable for any
indirect, incidental, consequential, special, punitive, or exemplary damages, including, without limitation, any loss of profits, data, business opportunities, or use, arising out of or in any way connected with you acting as the Resolver.
You further acknowledge that we disclaim all liability for any gains, losses, or damages incurred in connection with you acting as the Resolver, including execution failures, costs, or any other associated activities.
We bear no responsibility for the delegation and/or uniting of the Unicorn Power as part of the activities related to the Permissioned Proxy. The delegation process, as well as any actions taken within the Permissioned Proxy, and their outcomes are solely the responsibility of the parties involved and are undertaken at your own risk.
Any benefits or incentives associated with registering and/or acting as the Resolver are not guaranteed.
Any information or data provided through the 1inch Network Interface and/or the 1inch Fusion Mode, including the whitelist, incentive programs, or any other features, do not constitute financial or investment advice. It is your responsibility to conduct independent research and seek professional advice when making decisions.
We will not be held liable for any third-party websites, products, or services linked to you acting as the Resolver. Any interactions with third-party entities are solely your responsibility, and we shall not be accountable for any outcomes.
We cannot guarantee uninterrupted access to the 1inch Network Interface, including the 1inch Fusion Mode, occasional downtime or disruptions may occur. We shall not be held responsible for any resulting inconvenience or losses.
We shall not be held liable for the actions taken by Resolvers. You are solely responsible for your behavior and interactions as the Resolver, and we shall not be liable for any consequences thereof. You irrevocably waive any claims, demands, or recourse in relation to any transactions or activities as the Resolver, including any embedded costs.
The 1inch Fusion Mode’s functionality and any other features you may have access to as the Resolver may evolve over time. We reserve the right to modify, suspend, or discontinue any aspect of the 1inch Fusion Mode’s functionality and any other features you may have access to as the Resolver, including any features, costs, incentives, other functionalities, at our discretion. Any such changes will be communicated as feasible, and we shall not be held accountable for any inconvenience or disruptions arising from these modifications.
These Terms may be updated or modified from time to time. It is your responsibility to regularly review the terms and policies and ensure compliance with the most recent version.
By acting and/or registering as the Resolvere, you agree to indemnify and hold harmless the 1inch Network, its affiliates, partners, and representatives from any claims, damages, losses, or liabilities arising in connection with you acting as the Resolver.
13. Updates and Notifications
We may periodically update these Terms, including any additional sections or provisions, at any time by posting the revised version of these Terms with an updated revision date. Please regularly check for updates to ensure that you are aware of the most current version of the Terms.
The changes shall be deemed accepted by you, the first time you register and/or act as the Resolver after the initial posting of the revised Terms and shall apply on a going-forward basis with respect to your use of the 1inch Fusion Mode, unless otherwise expressly stated. If you do not agree with any such modification, your sole and exclusive remedy is to terminate your status as the Resolver.
Failure to comply with the updated terms may result in the termination of your status as the Resolver.
ANNEX A
EXCLUSIVE RESOLVER API
SERVICE LEVEL AGREEMENT
This Service Level Agreement (“
SLA
”) shall constitute an integral part of the 1inch Network Terms of Use for Resolvers (“
1inch Network Terms of Use for Resolvers
” , “
Terms
”) and should be read in conjunction with the Terms. All capitalized terms used herein shall have the same meaning as assigned to them in the Terms, unless other expressly stated otherwise.
This SLA applies solely to the Exclusive Resolver API functionality. Please, note that this SLA may be subject to change, and any modifications will be communicated by 1inch in advance, as reasonably possible.
1. Exclusive Resolver
1.1. For the purpose of this SLA, "
Exclusive Resolver
" refers to the Resolver that has provided the Resolver’s API endpoint to be exclusively selected to fill the Fusion Order at the beginning of the Fusion Order’s Dutch auction, as vetted by 1inch from time to time.
1.2. The Exclusive Resolver shall be considered vetted provided that:
The promoted resolver-worker address of the Resolver is included in the list of the Whitelisted Resolvers;
The allowance field is zero, while other Resolvers have non zero allowance; and
The Fusion Order contains one of initialRateBump provided by the Resolver’s API endpoint. The filled Fusion Order’s Maker amount (makerAmount) must be the same as provided by the Resolver’s API endpoint for the specific rate bump at the beginning of the Fusion Order’s Dutch auction (initialRateBump).
2. Service Level Commitment
2.1. The Exclusive Resolver shall execute the Exclusive Order before the end of the exclusivity period subject to the Performance Metrics as defined below.
2.2. "
Exclusivity Period
" refers to a specific timeframe defined by the 1inch Quoter within which the Exclusive Resolver has the sole right to fill the Fusion Order.
2.3. "
Exclusive Order
" refers to the Fusion Order submitted by the Maker to the 1inch Relayer to which the Exclusive Resolver has provided the quote within the Response Time.
3. Performance Metrics
3.1. Response Time (including any delays in network communication). Upon receiving a quote request, the Exclusive Resolver shall respond within 500 milliseconds (ms), providing one of the following:
An API Response: "grid", meaning an array containing details of proposed price improvements with a maximum of 50 items. Each item includes:
makerAmount: The partial or full fill amount.
initialRateBump: The rate bump at the beginning of the Fusion Order Dutch auction: minimum of 0 to a maximum of 16777215, with 10000000 representing 100%.
An Error Code:
400 Bad Request:
Token pair is not supported.
Inability to provide a quote for specified makerAmount / minTakerAmount / makerAddress.
500 Internal Server Error: an unexpected error occurred on the server.
3.2.
Fill Rate
. The Exclusive Resolver shall maintain a minimum fill rate of 90% for the Exclusive Orders as calculated on a rolling 7 calendar days period. "
Fill Rate
" is calculated based on the following formula:
4. Performance Monitoring
4.1. The 1inch technical team will conduct continuous performance monitoring of the Exclusive Resolvers’ adherence to the Performance Metrics.
4.2. In cases where performance monitoring reveals that the Exclusive Resolver fails to meet the Performance Metrics, the 1inch technical team may enforce the restriction measures as defined below. 1inch reserves the right to determine and address any case of non-compliance at its sole discretion.
5. Non-Compliance and Restriction Measures
5.1. In order to ensure smooth and reliable user experience within the 1inch Fusion Mode, any case of non-compliance with the Performance Metrics may be subject to the following restriction measures:
Performance Metric
Measurement Period
First Non-Compliance
Second Non-Compliance
Third Non-Compliance
90% Fill Rate
Rolling 7 calendar day period
Warning
Suspension from using the Exclusive Resolver functionality (7 calendar days)
Block from using the Exclusive Resolver functionality (30 calendar days)
5.2. The warning will be sent from the 1inch analytics team via the previously provided by the Resolver contacts and other available private means of communication.
5.3. These measures will be cumulative, following the provisions outlined in the preceding table.
5.4. 1inch reserves the right to implement, modify, or replace the restriction measures to the extent that may be necessary to enhance the functionality of the Exclusive Resolver API and ensure the optimal performance of the 1inch Fusion Mode.
6. SLA Exclusions
6.1. This SLA does not apply to any:
Features and functionality that are not explicitly included in this SLA;
Any disruptions or changes in the normal process of operation of the Fusion Mode within 1inch's direct control or by force majeure events beyond 1inch's direct control;
Force majeure events and other issues beyond the Resolver’s direct control that prevent normal operation of the Resolver within the 1inch Fusion Mode, provided that immediate notice is given to 1inch by the Resolver.
1inch Network Interface Terms of Use
1inch Network Interface Privacy Policy
Previous
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Next
Resolver verification
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use



---


# 4. Deposit Phase (Escrow)

## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Overview
Fusion+ (intent-based atomic cross-chain swaps)
Fusion+ provides a quick and easy way to exchange assets across different blockchains by utilizing resolvers to handle the entire process. This approach significantly simplifies the user experience compared to traditional atomic swaps, where both parties must be actively involved. The system still employs escrow and hash time locks to ensure security, but the resolver manages everything, including locating the best rate through a gas-sensitive Dutch auction.
By integrating Fusion+ into your project, your users will have a smoother, highly secure, and more intuitive cross-chain transaction experience. This integration eliminates the need for intermediaries, making cross-chain transactions more efficient and user-friendly.
Read the 1inch Fusion+ whitepaper
Key benefits
Ultimate cross-chain interoperability: swap thousands of assets across all supported chains.
White-glove user experience: once the maker signs the Fusion order, the resolver handles all operations, streamlining the entire experience.
Best rates on the market: the Dutch auction system ensures you receive the best possible rates as resolvers compete to execute the order.
Increased reliability: resolvers step in to complete the transaction if needed, ensuring the swap is finalized securely.
Robust security: the use of hashlocks, timelocks, and KYC-compliant resolvers ensures a secure and compliant swap process.
Supported networks
Ethereum Mainnet
Arbitrum
Avalanche
BNB Chain
Gnosis
Sonic
Optimism
Polygon
Base
Unichain
Intent-based swaps (Fusion)
1inch intent-swaps (Fusion mode) introduce a whole new frontier of swap capability, by leveraging the power of 3rd-party resolvers to execute trades. Through a dutch auction price curve, resolvers are incentivized to fill orders (intents) created by users.
Key benefits
Intent-based trading: you can specify your trading intentions, which can then be fulfilled by both onchain and offchain liquidity.
Inherant MEV protection: by design, you cannot lose money to front-running or "sandwich attacks" on your orders.
Gas cost abstraction: you can swap without the need for a balance of native assets (like ETH) in your wallet, as the resolvers cover all gas costs.
Enhanced flexibility: you can set specific conditions for your trades, with the possibility of post-trade interactions, thereby providing greater control over the execution.
Supported networks
Ethereum Mainnet
Arbitrum
Avalanche
BNB Chain
Gnosis
Solana
Sonic
Optimism
Polygon
zkSync Era
Base
Unichain
Classic swaps
1inch classic swaps (also known as the aggregation protocol) involve a highly sophisticated router that provides users with the best possible exchange rates across hundreds of decentralized exchanges (DEXes). It achieves this by splitting each swap across multiple liquidity sources to minimize negative price impact and optimize trade execution.
Key benefits
Extremely efficient rates: you can receive the best rate on the market, with direct access to hundreds of liquidity sources.
Reduced price impact: splits transactions across multiple liquidity pools to negate the impact of your trade on a single liquidity source.
Highly intelligent routing: harness the power of "connector tokens" which reduce price friction when swapping from asset A to asset B.
Customization: customize your trades with advanced options like partial fills, slippage tolerance, and direct protocol (Unoswap) interaction.
Supported networks
Ethereum Mainnet
Arbitrum
Avalanche
BNB Chain
Gnosis
Sonic
Optimism
Polygon
zkSync Era
Base
Unichain
Advantages of using 1inch swap APIs over other web3 providers
Comprehensive aggregation: the 1inch API aggregates liquidity from multiple sources, ensuring you always get the best possible rates.
Heavy gas-cost optimization: both classic aggregation and Fusion mode utilize sophisticated mechanisms to optimize trade execution, reducing gas costs and price impact in comparison to other protocols.
User-centric features: with intent-based swaps, you can tailor your trades to meet specific criteria, getting unmatched flexibility and control.
Robust security: built on decentralized protocols, 1inch ensures secure and reliable trading experiences.
Access to the deepest liquidity in DeFi: gives access to the largest array of liquidity pools, providing the best trade execution and reliability on the market.
By utilizing the 1inch API, you can benefit from superior trade execution, cost savings, and enhanced flexibility compared to other web3 swap APIs in the decentralized finance ecosystem.
Previous
Authentication
Next
Introduction
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/active
Get cross chain swap active orders
Parameters
page
number
(query)
Pagination step, default: 1 (page = offset / limit)
Example: 1
limit
number
(query)
Number of active orders to receive (default: 100, max: 500)
Example: 100
srcChain
number
(query)
Source chain of cross chain
Example: 1
dstChain
number
(query)
Destination chain of cross chain
Example: 137
swagger.response
Code:
200
Array of queried active orders
Code:
400
Input data is invalid
Code:
default
Schema:
GetActiveOrdersOutput
object
meta
*
Meta
object
totalItems
*
number
itemsPerPage
*
number
totalPages
*
number
currentPage
*
number
items
*
array
items
ActiveOrdersOutput
object
orderHash
*
string
signature
*
string
deadline
*
number
auctionStartDate
*
number
auctionEndDate
*
number
quoteId
*
string
remainingMakerAmount
*
string
makerBalance
*
string
makerAllowance
*
string
isMakerContract
*
boolean
extension
*
string
srcChainId
*
number
dstChainId
*
number
order
*
any
allOf[0]
CrossChainOrderDto
object
salt
*
string
maker
*
string
receiver
*
string
makerAsset
*
string
takerAsset
*
string
makingAmount
*
string
takingAmount
*
string
makerTraits
*
string
secretHashes
array
items
array
fills
*
array
items
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/active"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Introduction
Next
Get actual escrow factory contract address
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/escrow
Get actual escrow factory contract address
Network
Ethereum
[object Object]
Parameters
chainId
number
(query)
Chain ID
Example: 1
1
swagger.response
Code:
default
Schema:
EscrowFactory
object
address
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/escrow"
;
const
config
=
{
headers
:
undefined
,
params
:
{
chainId
:
"1"
,
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get cross chain swap active orders
Next
Get orders by maker address
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/maker/{address}
Get orders by maker address
Network
Ethereum
[object Object]
Parameters
address
string
*
(path)
Maker's address
Example: 0x1000000000000000000000000000000000000001
page
number
(query)
Pagination step, default: 1 (page = offset / limit)
Example: 1
limit
number
(query)
Number of active orders to receive (default: 100, max: 500)
Example: 100
timestampFrom
number
(query)
timestampFrom in milliseconds for interval [timestampFrom, timestampTo)
Example: 1750683155392
timestampTo
number
(query)
timestampTo in milliseconds for interval [timestampFrom, timestampTo)
Example: 1750683155392
srcToken
string
(query)
Find history by the given source token
Example: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
dstToken
string
(query)
Find history by the given destination token
Example: 0xc2132d05d31c914a87c6611c10748aeb04b58e8f
withToken
string
(query)
Find history items by source or destination token
Example: 0xc2132d05d31c914a87c6611c10748aeb04b58e8f
dstChainId
number
(query)
Destination chain of cross chain
Example: 137
srcChainId
number
(query)
Source chain of cross chain
Example: 1
chainId
number
(query)
chainId for looking by dstChainId == chainId OR srcChainId == chainId
Example: 56
1
swagger.response
Code:
default
Schema:
GetOrderByMakerOutput
object
meta
*
Meta
object
totalItems
*
number
itemsPerPage
*
number
totalPages
*
number
currentPage
*
number
items
*
array
items
ActiveOrdersOutput
object
orderHash
*
string
signature
*
string
deadline
*
number
auctionStartDate
*
number
auctionEndDate
*
number
quoteId
*
string
remainingMakerAmount
*
string
makerBalance
*
string
makerAllowance
*
string
isMakerContract
*
boolean
extension
*
string
srcChainId
*
number
dstChainId
*
number
order
*
any
allOf[0]
CrossChainOrderDto
object
salt
*
string
maker
*
string
receiver
*
string
makerAsset
*
string
takerAsset
*
string
makingAmount
*
string
takingAmount
*
string
makerTraits
*
string
secretHashes
array
items
array
fills
*
array
items
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/maker/{address}"
;
const
config
=
{
headers
:
undefined
,
params
:
{
chainId
:
"1"
,
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get actual escrow factory contract address
Next
Get all data to perform withdrawal and cancellation
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/secrets/{orderHash}
Get all data to perform withdrawal and cancellation
Parameters
orderHash
string
*
(path)
Example: 0xa0ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e9
swagger.response
Code:
201
Public secrets and all data related to withdrawal and cancellation
Code:
default
Schema:
ResolverDataOutput
object
orderType
*
string
(Enum)
SingleFill
MultipleFills
secrets
*
array
items
PublicSecret
object
idx
*
number
secret
*
string
srcImmutables
*
any
allOf[0]
Immutables
object
orderHash
*
string
hashlock
*
string
maker
*
string
taker
*
string
token
*
string
amount
*
string
safetyDeposit
*
string
timelocks
*
string
dstImmutables
*
any
allOf[0]
Immutables
object
orderHash
*
string
hashlock
*
string
maker
*
string
taker
*
string
token
*
string
amount
*
string
safetyDeposit
*
string
timelocks
*
string
secretHashes
array
items
array
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/secrets/{orderHash}"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get orders by maker address
Next
Get idx of each secret that is ready for submission for specific order
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/ready-to-accept-secret-fills/{orderHash}
Get idx of each secret that is ready for submission for specific order
Parameters
orderHash
string
*
(path)
Example: 0xa0ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e9
swagger.response
Code:
default
Schema:
ReadyToAcceptSecretFills
object
fills
*
array
items
ReadyToAcceptSecretFill
object
idx
*
number
srcEscrowDeployTxHash
*
string
dstEscrowDeployTxHash
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/ready-to-accept-secret-fills/{orderHash}"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get all data to perform withdrawal and cancellation
Next
Get idx of each secret that is ready for submission for all orders
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/ready-to-accept-secret-fills
Get idx of each secret that is ready for submission for all orders
swagger.response
Code:
default
Schema:
ReadyToAcceptSecretFillsForAllOrders
object
orders
*
array
items
ReadyToAcceptSecretFillsForOrder
object
orderHash
*
string
makerAddress
*
string
fills
*
array
items
ReadyToAcceptSecretFill
object
idx
*
number
srcEscrowDeployTxHash
*
string
dstEscrowDeployTxHash
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/ready-to-accept-secret-fills"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get idx of each secret that is ready for submission for specific order
Next
Get all data to perform a cancellation or withdrawal on public periods
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/ready-to-execute-public-actions
Get all data to perform a cancellation or withdrawal on public periods
swagger.response
Code:
default
Schema:
ReadyToExecutePublicActionsOutput
object
actions
*
array
items
ReadyToExecutePublicAction
object
action
*
string
(Enum)
withdraw
cancel
immutables
*
any
allOf[0]
Immutables
object
orderHash
*
string
hashlock
*
string
maker
*
string
taker
*
string
token
*
string
amount
*
string
safetyDeposit
*
string
timelocks
*
string
chainId
*
number
escrow
*
string
secret
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/ready-to-execute-public-actions"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get idx of each secret that is ready for submission for all orders
Next
Get order by hash
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
GET
https://api.1inch.dev/fusion-plus/orders/v1.0/order/status/{orderHash}
Get order by hash
Parameters
orderHash
string
*
(path)
Example: 0xa0ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e9
swagger.response
Code:
default
Schema:
GetOrderFillsByHashOutput
object
orderHash
*
string
status
*
string
(Enum)
pending
executed
expired
cancelled
refunding
refunded
validation
*
string
(Enum)
valid
order-predicate-returned-false
not-enough-balance
not-enough-allowance
invalid-permit-signature
invalid-permit-spender
invalid-permit-signer
invalid-signature
failed-to-parse-permit-details
unknown-permit-version
wrong-epoch-manager-and-bit-invalidator
failed-to-decode-remaining
unknown-failure
order
*
any
allOf[0]
LimitOrderV4StructOutput
object
salt
*
string
maker
*
string
receiver
*
string
makerAsset
*
string
takerAsset
*
string
makingAmount
*
string
takingAmount
*
string
makerTraits
*
string
extension
*
string
points
*
any
allOf[0]
AuctionPointOutput
object
delay
*
number
coefficient
*
number
approximateTakingAmount
*
string
positiveSurplus
*
string
fills
*
array
items
FillOutputDto
object
status
*
string
(Enum)
pending
executed
refunding
refunded
txHash
*
string
filledMakerAmount
*
string
filledAuctionTakerAmount
*
string
escrowEvents
*
array
items
EscrowEventDataOutput
object
transactionHash
*
string
escrow
*
string
side
*
string
(Enum)
src
dst
action
*
string
(Enum)
src_escrow_created
dst_escrow_created
withdrawn
funds_rescued
escrow_cancelled
blockTimestamp
*
number
auctionStartDate
*
number
auctionDuration
*
number
initialRateBump
*
number
createdAt
*
number
srcTokenPriceUsd
*
object
dstTokenPriceUsd
*
object
cancelTx
*
object
srcChainId
*
number
dstChainId
*
number
cancelable
*
boolean
takerAsset
*
string
timeLocks
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/status/{orderHash}"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get all data to perform a cancellation or withdrawal on public periods
Next
Get orders by hashes
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
GET
Get cross chain swap active orders
GET
Get actual escrow factory contract address
GET
Get orders by maker address
GET
Get all data to perform withdrawal and cancellation
GET
Get idx of each secret that is ready for submission for specific order
GET
Get idx of each secret that is ready for submission for all orders
GET
Get all data to perform a cancellation or withdrawal on public periods
GET
Get order by hash
POST
Get orders by hashes
Quoter
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Orders
1inch Fusion+ Orders API
POST
https://api.1inch.dev/fusion-plus/orders/v1.0/order/status
Get orders by hashes
Request Body
Content type
application/json
Click in to adjust the request body:
{
"orderHashes"
:
[
"0x10ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e9"
,
"0x20ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e8"
,
"0x30ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e7"
,
"0x40ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e6"
]
}
Request Body Schema:
OrdersByHashesInput
object
orderHashes
*
array
items
string
swagger.response
Code:
default
Schema:
GetOrderFillsByHashOutput
object
orderHash
*
string
status
*
string
(Enum)
pending
executed
expired
cancelled
refunding
refunded
validation
*
string
(Enum)
valid
order-predicate-returned-false
not-enough-balance
not-enough-allowance
invalid-permit-signature
invalid-permit-spender
invalid-permit-signer
invalid-signature
failed-to-parse-permit-details
unknown-permit-version
wrong-epoch-manager-and-bit-invalidator
failed-to-decode-remaining
unknown-failure
order
*
any
allOf[0]
LimitOrderV4StructOutput
object
salt
*
string
maker
*
string
receiver
*
string
makerAsset
*
string
takerAsset
*
string
makingAmount
*
string
takingAmount
*
string
makerTraits
*
string
extension
*
string
points
*
any
allOf[0]
AuctionPointOutput
object
delay
*
number
coefficient
*
number
approximateTakingAmount
*
string
positiveSurplus
*
string
fills
*
array
items
FillOutputDto
object
status
*
string
(Enum)
pending
executed
refunding
refunded
txHash
*
string
filledMakerAmount
*
string
filledAuctionTakerAmount
*
string
escrowEvents
*
array
items
EscrowEventDataOutput
object
transactionHash
*
string
escrow
*
string
side
*
string
(Enum)
src
dst
action
*
string
(Enum)
src_escrow_created
dst_escrow_created
withdrawn
funds_rescued
escrow_cancelled
blockTimestamp
*
number
auctionStartDate
*
number
auctionDuration
*
number
initialRateBump
*
number
createdAt
*
number
srcTokenPriceUsd
*
object
dstTokenPriceUsd
*
object
cancelTx
*
object
srcChainId
*
number
dstChainId
*
number
cancelable
*
boolean
takerAsset
*
string
timeLocks
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/orders/v1.0/order/status"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
const
body
=
{
orderHashes
:
[
"0x10ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e9"
,
"0x20ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e8"
,
"0x30ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e7"
,
"0x40ea5bd12b2d04566e175de24c2df41a058bf16df4af3eb2fb9bff38a9da98e6"
,
]
,
}
;
try
{
const
response
=
await
axios
.
post
(
url
,
body
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get order by hash
Next
Get quote details based on input data
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
GET
Get quote details based on input data
POST
Get quote with custom preset details
POST
Build order by given quote
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
GET
Get quote details based on input data
POST
Get quote with custom preset details
POST
Build order by given quote
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Quoter
1inch Fusion+ Quoter API
GET
https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive
Get quote details based on input data
Parameters
srcChain
number
*
(query)
Id of source chain
Example: 1
dstChain
number
*
(query)
Id of destination chain
Example: 137
srcTokenAddress
string
*
(query)
Address of "SOURCE" token in source chain
Example: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
dstTokenAddress
string
*
(query)
Address of "DESTINATION" token in destination chain
Example: 0x2791bca1f2de4661ed88a30c99a7a9449aa84174
amount
number
*
(query)
Amount to take from "SOURCE" token to get "DESTINATION" token
Example: 100000000000000000
walletAddress
string
*
(query)
An address of the wallet or contract in source chain who will create Fusion order
Example: 0x0000000000000000000000000000000000000000
enableEstimate
boolean
*
(query)
if enabled then get estimation from 1inch swap builder and generates quoteId, by default is false
Example: false
fee
number
(query)
fee in bps format, 1% is equal to 100bps
Example: 0
isPermit2
string
(query)
permit2 allowance transfer encoded call
permit
string
(query)
permit, user approval sign
swagger.response
Code:
200
Returns quote
Code:
400
Input data is invalid
Code:
default
Schema:
GetQuoteOutput
object
quoteId
*
object
srcTokenAmount
*
string
dstTokenAmount
*
string
presets
*
any
allOf[0]
QuotePresets
object
fast
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
medium
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
slow
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
custom
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
srcEscrowFactory
*
string
dstEscrowFactory
*
string
whitelist
*
array
items
string
timeLocks
*
any
allOf[0]
TimeLocks
object
srcWithdrawal
*
number
srcPublicWithdrawal
*
number
srcCancellation
*
number
srcPublicCancellation
*
number
dstWithdrawal
*
number
dstPublicWithdrawal
*
number
dstCancellation
*
number
srcSafetyDeposit
*
string
dstSafetyDeposit
*
string
recommendedPreset
*
string
(Enum)
fast
slow
medium
custom
prices
*
PairCurrency
object
usd
*
TokenPair
object
srcToken
*
string
dstToken
*
string
volume
*
PairCurrency
object
usd
*
TokenPair
object
srcToken
*
string
dstToken
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
get
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get orders by hashes
Next
Get quote with custom preset details
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
GET
Get quote details based on input data
POST
Get quote with custom preset details
POST
Build order by given quote
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
GET
Get quote details based on input data
POST
Get quote with custom preset details
POST
Build order by given quote
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Quoter
1inch Fusion+ Quoter API
POST
https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive
Get quote with custom preset details
Parameters
srcChain
number
*
(query)
Id of source chain
Example: 1
dstChain
number
*
(query)
Id of destination chain
Example: 137
srcTokenAddress
string
*
(query)
Address of "SOURCE" token
Example: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
dstTokenAddress
string
*
(query)
Address of "DESTINATION" token
Example: 0x2791bca1f2de4661ed88a30c99a7a9449aa84174
amount
number
*
(query)
Amount to take from "SOURCE" token to get "DESTINATION" token
Example: 100000000000000000
walletAddress
string
*
(query)
An address of the wallet or contract who will create Fusion order
Example: 0x0000000000000000000000000000000000000000
enableEstimate
boolean
*
(query)
if enabled then get estimation from 1inch swap builder and generates quoteId, by default is false
Example: false
fee
number
(query)
fee in bps format, 1% is equal to 100bps
Example: 0
isPermit2
string
(query)
permit2 allowance transfer encoded call
permit
string
(query)
permit, user approval sign
Request Body
Content type
application/json
Click in to adjust the request body:
{
}
Request Body Schema:
CustomPresetParams
object
swagger.response
Code:
200
Returns slippage, quoteId and presets with custom preset details as well
Code:
400
Input data is invalid
Code:
default
Schema:
GetQuoteOutput
object
quoteId
*
object
srcTokenAmount
*
string
dstTokenAmount
*
string
presets
*
any
allOf[0]
QuotePresets
object
fast
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
medium
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
slow
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
custom
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
srcEscrowFactory
*
string
dstEscrowFactory
*
string
whitelist
*
array
items
string
timeLocks
*
any
allOf[0]
TimeLocks
object
srcWithdrawal
*
number
srcPublicWithdrawal
*
number
srcCancellation
*
number
srcPublicCancellation
*
number
dstWithdrawal
*
number
dstPublicWithdrawal
*
number
dstCancellation
*
number
srcSafetyDeposit
*
string
dstSafetyDeposit
*
string
recommendedPreset
*
string
(Enum)
fast
slow
medium
custom
prices
*
PairCurrency
object
usd
*
TokenPair
object
srcToken
*
string
dstToken
*
string
volume
*
PairCurrency
object
usd
*
TokenPair
object
srcToken
*
string
dstToken
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
try
{
const
response
=
await
axios
.
post
(
url
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get orders by hashes
Next
Get quote with custom preset details
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
GET
Get quote details based on input data
POST
Get quote with custom preset details
POST
Build order by given quote
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
GET
Get quote details based on input data
POST
Get quote with custom preset details
POST
Build order by given quote
Relayer
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Quoter
1inch Fusion+ Quoter API
POST
https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/build
Build order by given quote
Parameters
srcChain
number
*
(query)
Id of source chain
Example: 1
dstChain
number
*
(query)
Id of destination chain
Example: 137
srcTokenAddress
string
*
(query)
Address of "SOURCE" token
Example: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
dstTokenAddress
string
*
(query)
Address of "DESTINATION" token
Example: 0x2791bca1f2de4661ed88a30c99a7a9449aa84174
amount
number
*
(query)
Amount to take from "SOURCE" token to get "DESTINATION" token
Example: 100000000000000000
walletAddress
string
*
(query)
An address of the wallet or contract who will create Fusion order
Example: 0x0000000000000000000000000000000000000000
fee
number
(query)
fee in bps format, 1% is equal to 100bps
Example: 0
source
string
(query)
Frontend or some other source selector
Example: Frontend
isPermit2
string
(query)
permit2 allowance transfer encoded call
isMobile
string
(query)
Enabled flag allows to save quote for Mobile History
feeReceiver
string
(query)
In case fee non zero -> the fee will be transferred to this address
permit
string
(query)
permit, user approval sign
preset
string
(query)
fast/medium/slow/custom
Request Body
Content type
application/json
Click in to adjust the request body:
{
"quote"
:
{
"quoteId"
:
"test_test_test"
,
"srcTokenAmount"
:
"100000000000000000"
,
"dstTokenAmount"
:
"250418225"
,
"presets"
:
{
"fast"
:
{
"bankFee"
:
"0"
,
"auctionDuration"
:
100
,
"startAuctionIn"
:
2
,
"initialRateBump"
:
1000
,
"auctionStartAmount"
:
"250418225"
,
"startAmount"
:
"250418225"
,
"auctionEndAmount"
:
"250418225"
,
"exclusiveResolver"
:
null
,
"costInDstToken"
:
"517184548685636"
,
"points"
:
[
{
"delay"
:
12
,
"rateBump"
:
455
}
]
,
"allowPartialFills"
:
false
,
"allowMultipleFills"
:
false
,
"gasCost"
:
{
"gasBumpEstimate"
:
54
,
"gasPriceEstimate"
:
"1231"
}
}
}
,
"timeLocks"
:
{
"srcWithdrawal"
:
20
,
"srcPublicWithdrawal"
:
21
,
"srcCancellation"
:
22
,
"srcPublicCancellation"
:
23
,
"dstWithdrawal"
:
24
,
"dstPublicWithdrawal"
:
25
,
"dstCancellation"
:
26
}
,
"srcEscrowFactory"
:
"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
,
"dstEscrowFactory"
:
"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
,
"srcSafetyDeposit"
:
"123"
,
"dstSafetyDeposit"
:
"123"
,
"whitelist"
:
[
"0x1d3b67bca8935cb510c8d18bd45f0b94f54a9681"
]
,
"pubKeys"
:
[
"0x0454d169b35a0061088d88c00f273f4a2ab603f45077abb2e404b94bff59238c5dfb7eb92ec442a8522ab88b471b7ba2fe9adc304a4ff1696d8afccd99e5e3531a"
]
,
"secretsCount"
:
1
,
"recommendedPreset"
:
"fast"
,
"prices"
:
{
"usd"
:
{
"srcToken"
:
"2505.44210175"
,
"dstToken"
:
"1.0008429148729692"
}
}
,
"volume"
:
{
"usd"
:
{
"srcToken"
:
"250.544210175"
,
"dstToken"
:
"250.62930624631504754367"
}
}
,
"priceImpactPercent"
:
0
,
"autoK"
:
0.1
,
"k"
:
0.2
,
"mxK"
:
1
}
,
"secretsHashList"
:
[
"0x315b47a8c3780434b153667588db4ca628526e20000000000000000000000000"
]
}
Request Body Schema:
BuildOrderBody
object
quote
*
any
allOf[0]
GetQuoteOutput
object
quoteId
*
object
srcTokenAmount
*
string
dstTokenAmount
*
string
presets
*
any
allOf[0]
QuotePresets
object
fast
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
medium
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
slow
*
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
custom
any
allOf[0]
Preset
object
auctionDuration
*
number
startAuctionIn
*
number
initialRateBump
*
number
auctionStartAmount
*
string
startAmount
*
string
auctionEndAmount
*
string
exclusiveResolver
*
object
costInDstToken
*
string
points
*
array
items
AuctionPoint
object
delay
*
number
coefficient
*
number
allowPartialFills
*
boolean
allowMultipleFills
*
boolean
gasCost
*
GasCostConfig
object
gasBumpEstimate
*
number
gasPriceEstimate
*
string
secretsCount
*
number
srcEscrowFactory
*
string
dstEscrowFactory
*
string
whitelist
*
array
items
string
timeLocks
*
any
allOf[0]
TimeLocks
object
srcWithdrawal
*
number
srcPublicWithdrawal
*
number
srcCancellation
*
number
srcPublicCancellation
*
number
dstWithdrawal
*
number
dstPublicWithdrawal
*
number
dstCancellation
*
number
srcSafetyDeposit
*
string
dstSafetyDeposit
*
string
recommendedPreset
*
string
(Enum)
fast
slow
medium
custom
prices
*
PairCurrency
object
usd
*
TokenPair
object
srcToken
*
string
dstToken
*
string
volume
*
PairCurrency
object
usd
*
TokenPair
object
srcToken
*
string
dstToken
*
string
secretsHashList
*
string
swagger.response
Code:
200
Returns cross chain order details
Code:
400
Input data is invalid
Code:
default
Schema:
BuildOrderOutput
object
typedData
*
object
orderHash
*
string
extension
*
string
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/build"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
const
body
=
{
quote
:
{
quoteId
:
"test_test_test"
,
srcTokenAmount
:
"100000000000000000"
,
dstTokenAmount
:
"250418225"
,
presets
:
{
fast
:
{
bankFee
:
"0"
,
auctionDuration
:
100
,
startAuctionIn
:
2
,
initialRateBump
:
1000
,
auctionStartAmount
:
"250418225"
,
startAmount
:
"250418225"
,
auctionEndAmount
:
"250418225"
,
exclusiveResolver
:
null
,
costInDstToken
:
"517184548685636"
,
points
:
[
{
delay
:
12
,
rateBump
:
455
,
}
,
]
,
allowPartialFills
:
false
,
allowMultipleFills
:
false
,
gasCost
:
{
gasBumpEstimate
:
54
,
gasPriceEstimate
:
"1231"
,
}
,
}
,
}
,
timeLocks
:
{
srcWithdrawal
:
20
,
srcPublicWithdrawal
:
21
,
srcCancellation
:
22
,
srcPublicCancellation
:
23
,
dstWithdrawal
:
24
,
dstPublicWithdrawal
:
25
,
dstCancellation
:
26
,
}
,
srcEscrowFactory
:
"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
,
dstEscrowFactory
:
"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
,
srcSafetyDeposit
:
"123"
,
dstSafetyDeposit
:
"123"
,
whitelist
:
[
"0x1d3b67bca8935cb510c8d18bd45f0b94f54a9681"
]
,
pubKeys
:
[
"0x0454d169b35a0061088d88c00f273f4a2ab603f45077abb2e404b94bff59238c5dfb7eb92ec442a8522ab88b471b7ba2fe9adc304a4ff1696d8afccd99e5e3531a"
,
]
,
secretsCount
:
1
,
recommendedPreset
:
"fast"
,
prices
:
{
usd
:
{
srcToken
:
"2505.44210175"
,
dstToken
:
"1.0008429148729692"
,
}
,
}
,
volume
:
{
usd
:
{
srcToken
:
"250.544210175"
,
dstToken
:
"250.62930624631504754367"
,
}
,
}
,
priceImpactPercent
:
0
,
autoK
:
0.1
,
k
:
0.2
,
mxK
:
1
,
}
,
secretsHashList
:
[
"0x315b47a8c3780434b153667588db4ca628526e20000000000000000000000000"
,
]
,
}
;
try
{
const
response
=
await
axios
.
post
(
url
,
body
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Get quote with custom preset details
Next
Submit a cross chain order that resolvers will be able to fill
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
Relayer
POST
Submit a cross chain order that resolvers will be able to fill
POST
Submit many cross chain orders that resolvers will be able to fill
POST
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
Relayer
POST
Submit a cross chain order that resolvers will be able to fill
POST
Submit many cross chain orders that resolvers will be able to fill
POST
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Relayer
1inch Fusion+ Relayer API
POST
https://api.1inch.dev/fusion-plus/relayer/v1.0/submit
Submit a cross chain order that resolvers will be able to fill
Request Body
Content type
application/json
Click in to adjust the request body:
{
"order"
:
{
"salt"
:
"42"
,
"makerAsset"
:
"0x0000000000000000000000000000000000000001"
,
"takerAsset"
:
"0x0000000000000000000000000000000000000001"
,
"maker"
:
"0x0000000000000000000000000000000000000001"
,
"receiver"
:
"0x0000000000000000000000000000000000000001"
,
"makingAmount"
:
"100000000000000000000"
,
"takingAmount"
:
"100000000000000000000"
,
"makerTraits"
:
"0"
}
,
"srcChainId"
:
1
,
"signature"
:
"string"
,
"extension"
:
"0x"
,
"quoteId"
:
"string"
,
"secretHashes"
:
[
"string"
]
}
Request Body Schema:
SignedOrderInput
object
order
*
any
allOf[0]
OrderInput
object
salt
*
string
makerAsset
*
string
takerAsset
*
string
maker
*
string
receiver
*
string
makingAmount
*
string
takingAmount
*
string
makerTraits
*
string
srcChainId
*
number
signature
*
string
extension
*
string
quoteId
*
string
secretHashes
array
items
string
swagger.response
Code:
201
The order has been successfully saved
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/relayer/v1.0/submit"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
const
body
=
{
order
:
{
salt
:
"42"
,
makerAsset
:
"0x0000000000000000000000000000000000000001"
,
takerAsset
:
"0x0000000000000000000000000000000000000001"
,
maker
:
"0x0000000000000000000000000000000000000001"
,
receiver
:
"0x0000000000000000000000000000000000000001"
,
makingAmount
:
"100000000000000000000"
,
takingAmount
:
"100000000000000000000"
,
makerTraits
:
"0"
,
}
,
srcChainId
:
1
,
signature
:
"string"
,
extension
:
"0x"
,
quoteId
:
"string"
,
secretHashes
:
[
"string"
]
,
}
;
try
{
const
response
=
await
axios
.
post
(
url
,
body
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Build order by given quote
Next
Submit many cross chain orders that resolvers will be able to fill
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
Relayer
POST
Submit a cross chain order that resolvers will be able to fill
POST
Submit many cross chain orders that resolvers will be able to fill
POST
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
Relayer
POST
Submit a cross chain order that resolvers will be able to fill
POST
Submit many cross chain orders that resolvers will be able to fill
POST
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Relayer
1inch Fusion+ Relayer API
POST
https://api.1inch.dev/fusion-plus/relayer/v1.0/submit/many
Submit many cross chain orders that resolvers will be able to fill
Request Body
Content type
application/json
Click in to adjust the request body:
[
"string"
]
Request Body Schema:
array
items
string
swagger.response
Code:
201
The orders has been successfully saved
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/relayer/v1.0/submit/many"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
const
body
=
[
"string"
]
;
try
{
const
response
=
await
axios
.
post
(
url
,
body
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Submit a cross chain order that resolvers will be able to fill
Next
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
Relayer
POST
Submit a cross chain order that resolvers will be able to fill
POST
Submit many cross chain orders that resolvers will be able to fill
POST
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Orders
Quoter
Relayer
POST
Submit a cross chain order that resolvers will be able to fill
POST
Submit many cross chain orders that resolvers will be able to fill
POST
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Becoming a resolver
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Relayer
1inch Fusion+ Relayer API
POST
https://api.1inch.dev/fusion-plus/relayer/v1.0/submit/secret
Submit a secret for order fill after SrcEscrow and DstEscrow deployed and DstChain finality lock passed
Request Body
Content type
application/json
Click in to adjust the request body:
{
"secret"
:
"string"
,
"orderHash"
:
"string"
}
Request Body Schema:
SecretInput
object
secret
*
string
orderHash
*
string
swagger.response
Code:
201
The secret has been successfully saved
Authorization - API KEY
API KEY
Sign in
for automatic API key authentication.
Try it
NodeJS
Python
cURL
Go
More
const
axios
=
require
(
"axios"
)
;
async
function
httpCall
(
)
{
const
url
=
"https://api.1inch.dev/fusion-plus/relayer/v1.0/submit/secret"
;
const
config
=
{
headers
:
undefined
,
params
:
{
}
,
paramsSerializer
:
{
indexes
:
null
,
}
,
}
;
const
body
=
{
secret
:
"string"
,
orderHash
:
"string"
,
}
;
try
{
const
response
=
await
axios
.
post
(
url
,
body
,
config
)
;
console
.
log
(
response
.
data
)
;
}
catch
(
error
)
{
console
.
error
(
error
)
;
}
}
Response
Click the try-it button to test your API call and see the real-time response right here.
Previous
Submit many cross chain orders that resolvers will be able to fill
Next
Terms of Use for Resolvers
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Fusion+ test examples
Test 1: Basic Fusion+ order
Initialization
: set up the environment including initializing chains, wallets, and contracts.
Fetching orders
: fetch existing orders via 1inch Fusion+ Websocket API.
Escrow creation and deposit
: create and deposit assets into source and destination chain escrows.
Escrow verification and withdrawals
: withdraw funds from the escrow after relayer validation, ensuring that both resolver and the maker receive the correct amounts on different chains.
Test 2: Partial fill order
Partial fills
: create an order with multiple secrets, then execute those fills using each correct secret.
Creating the order
Filling the order
Test 3: Order cancellation
Order cancellation or public withdrawal
: cancel an order by creating a new order with a hash lock and managing the withdrawal process.
Initialization
import
'dotenv/config'
import
{
expect
,
jest
}
from
'@jest/globals'
import
{
createServer
,
CreateServerReturnType
}
from
'prool'
import
{
anvil
}
from
'prool/instances'
import
Sdk
from
'@1inch/cross-chain-sdk'
import
{
computeAddress
,
ContractFactory
,
JsonRpcProvider
,
MaxUint256
,
parseEther
,
parseUnits
,
randomBytes
,
Wallet
as
SignerWallet
}
from
'ethers'
import
{
uint8ArrayToHex
,
UINT_40_MAX
}
from
'@1inch/byte-utils'
import
assert
from
'node:assert'
import
{
ChainConfig
,
config
}
from
'./config'
import
{
Wallet
}
from
'./wallet'
import
{
Resolver
}
from
'./resolver'
import
{
EscrowFactory
}
from
'./escrow-factory'
import
factoryContract
from
'../dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json'
import
resolverContract
from
'../dist/contracts/Resolver.sol/Resolver.json'
const
{
Address
}
=
Sdk
jest
.
setTimeout
(
1000
*
60
)
// Private keys for testing (NEVER EXPOSE YOUR REAL PRIVATE KEY)
const
userPk
=
'0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const
resolverPk
=
'0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
describe
(
'Resolving example'
,
(
)
=>
{
const
srcChainId
=
config
.
chain
.
source
.
chainId
const
dstChainId
=
config
.
chain
.
destination
.
chainId
// Define chain-related data
type Chain
=
{
node
?
:
CreateServerReturnType
|
undefined
provider
:
JsonRpcProvider
escrowFactory
:
string
resolver
:
string
}
// Variables for chain and wallet data
let
src
:
Chain
let
dst
:
Chain
let
srcChainUser
:
Wallet
let
dstChainUser
:
Wallet
let
srcChainResolver
:
Wallet
let
dstChainResolver
:
Wallet
let
srcFactory
:
EscrowFactory
let
dstFactory
:
EscrowFactory
let
srcResolverContract
:
Wallet
let
dstResolverContract
:
Wallet
let
srcTimestamp
:
bigint
// Store the current timestamp
// Utility to increase time on both chains
async
function
increaseTime
(
t
:
number
)
:
Promise
<
void
>
{
await
Promise
.
all
(
[
src
,
dst
]
.
map
(
(
chain
)
=>
chain
.
provider
.
send
(
'evm_increaseTime'
,
[
t
]
)
)
)
}
// Setup before running tests
beforeAll
(
async
(
)
=>
{
// Initialize chains
;
[
src
,
dst
]
=
await
Promise
.
all
(
[
initChain
(
config
.
chain
.
source
)
,
initChain
(
config
.
chain
.
destination
)
]
)
// Initialize wallets
srcChainUser
=
new
Wallet
(
userPk
,
src
.
provider
)
dstChainUser
=
new
Wallet
(
userPk
,
dst
.
provider
)
srcChainResolver
=
new
Wallet
(
resolverPk
,
src
.
provider
)
dstChainResolver
=
new
Wallet
(
resolverPk
,
dst
.
provider
)
// Initialize factory contracts
srcFactory
=
new
EscrowFactory
(
src
.
provider
,
src
.
escrowFactory
)
dstFactory
=
new
EscrowFactory
(
dst
.
provider
,
dst
.
escrowFactory
)
// Top up user account and approve tokens
await
srcChainUser
.
topUpFromDonor
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
,
config
.
chain
.
source
.
tokens
.
USDC
.
donor
,
parseUnits
(
'1000'
,
6
)
)
await
srcChainUser
.
approveToken
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
,
config
.
chain
.
source
.
limitOrderProtocol
,
MaxUint256
)
// Initialize resolver contracts and top up balances
srcResolverContract
=
await
Wallet
.
fromAddress
(
src
.
resolver
,
src
.
provider
)
dstResolverContract
=
await
Wallet
.
fromAddress
(
dst
.
resolver
,
dst
.
provider
)
await
dstResolverContract
.
topUpFromDonor
(
config
.
chain
.
destination
.
tokens
.
USDC
.
address
,
config
.
chain
.
destination
.
tokens
.
USDC
.
donor
,
parseUnits
(
'2000'
,
6
)
)
await
dstChainResolver
.
transfer
(
dst
.
resolver
,
parseEther
(
'1'
)
)
await
dstResolverContract
.
unlimitedApprove
(
config
.
chain
.
destination
.
tokens
.
USDC
.
address
,
dst
.
escrowFactory
)
// Store the current timestamp from the source chain
srcTimestamp
=
BigInt
(
(
await
src
.
provider
.
getBlock
(
'latest'
)
)
!
.
timestamp
)
}
)
// Retrieve balances for maker and resolver on both chains
async
function
getBalances
(
srcToken
:
string
,
dstToken
:
string
)
:
Promise
<
{
src
:
{
user
:
bigint
;
resolver
:
bigint
}
;
dst
:
{
user
:
bigint
;
resolver
:
bigint
}
}
>
{
return
{
src
:
{
user
:
await
srcChainUser
.
tokenBalance
(
srcToken
)
,
resolver
:
await
srcResolverContract
.
tokenBalance
(
srcToken
)
}
,
dst
:
{
user
:
await
dstChainUser
.
tokenBalance
(
dstToken
)
,
resolver
:
await
dstResolverContract
.
tokenBalance
(
dstToken
)
}
}
}
Fetching orders
// Test suite for filling an order
describe
(
'Fill'
,
(
)
=>
{
// Swapping USDC between Ethereum and BSC
it
(
'should swap Ethereum USDC -> Bsc USDC. Single fill only'
,
async
(
)
=>
{
const
initialBalances
=
await
getBalances
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
,
config
.
chain
.
destination
.
tokens
.
USDC
.
address
)
// Create a cross-chain order
const
secret
=
uint8ArrayToHex
(
randomBytes
(
32
)
)
const
order
=
Sdk
.
CrossChainOrder
.
new
(
new
Address
(
src
.
escrowFactory
)
,
{
salt
:
Sdk
.
randBigInt
(
1000n
)
,
maker
:
new
Address
(
await
srcChainUser
.
getAddress
(
)
)
,
makingAmount
:
parseUnits
(
'100'
,
6
)
,
takingAmount
:
parseUnits
(
'99'
,
6
)
,
makerAsset
:
new
Address
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
)
,
takerAsset
:
new
Address
(
config
.
chain
.
destination
.
tokens
.
USDC
.
address
)
}
,
{
hashLock
:
Sdk
.
HashLock
.
forSingleFill
(
secret
)
,
timeLocks
:
Sdk
.
TimeLocks
.
new
(
{
srcWithdrawal
:
10n
,
srcPublicWithdrawal
:
120n
,
srcCancellation
:
121n
,
srcPublicCancellation
:
122n
,
dstWithdrawal
:
10n
,
dstPublicWithdrawal
:
100n
,
dstCancellation
:
101n
}
)
,
srcChainId
,
dstChainId
,
srcSafetyDeposit
:
parseEther
(
'0.001'
)
,
dstSafetyDeposit
:
parseEther
(
'0.001'
)
}
,
{
auction
:
new
Sdk
.
AuctionDetails
(
{
initialRateBump
:
0
,
points
:
[
]
,
duration
:
120n
,
startTime
:
srcTimestamp
}
)
,
whitelist
:
[
{
address
:
new
Address
(
src
.
resolver
)
,
allowFrom
:
0n
}
]
,
resolvingStartTime
:
0n
}
,
{
nonce
:
Sdk
.
randBigInt
(
UINT_40_MAX
)
,
allowPartialFills
:
false
,
allowMultipleFills
:
false
}
)
// Sign the order and calculate its hash
const
signature
=
await
srcChainUser
.
signOrder
(
srcChainId
,
order
)
;
const
orderHash
=
order
.
getOrderHash
(
srcChainId
)
;
Escrow creation and deposit
// Initialize resolver contract and log the order fill process
const
resolverContract
=
new
Resolver
(
src
.
resolver
,
dst
.
resolver
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Filling order
${
orderHash
}
`
)
;
// Fill the order on the source chain
const
fillAmount
=
order
.
makingAmount
;
const
{
txHash
:
orderFillHash
,
blockHash
:
srcDeployBlock
}
=
await
srcChainResolver
.
send
(
resolverContract
.
deploySrc
(
srcChainId
,
order
,
signature
,
Sdk
.
TakerTraits
.
default
(
)
.
setExtension
(
order
.
extension
)
.
setAmountMode
(
Sdk
.
AmountMode
.
maker
)
.
setAmountThreshold
(
order
.
takingAmount
)
,
fillAmount
,
)
,
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Order
${
orderHash
}
filled for
${
fillAmount
}
in tx
${
orderFillHash
}
`
,
)
;
// Handle event and deposit on the destination chain
const
srcEscrowEvent
=
await
srcFactory
.
getSrcDeployEvent
(
srcDeployBlock
)
;
const
dstImmutables
=
srcEscrowEvent
[
0
]
.
withComplement
(
srcEscrowEvent
[
1
]
)
.
withTaker
(
new
Address
(
resolverContract
.
dstAddress
)
)
;
console
.
log
(
`
[
${
dstChainId
}
]
`
,
`
Depositing
${
dstImmutables
.
amount
}
for order
${
orderHash
}
`
,
)
;
const
{
txHash
:
dstDepositHash
,
blockTimestamp
:
dstDeployedAt
}
=
await
dstChainResolver
.
send
(
resolverContract
.
deployDst
(
dstImmutables
)
)
;
console
.
log
(
`
[
${
dstChainId
}
]
`
,
`
Created dst deposit for order
${
orderHash
}
in tx
${
dstDepositHash
}
`
,
)
;
// Retrieve and calculate escrow contract addresses
const
ESCROW_SRC_IMPLEMENTATION
=
await
srcFactory
.
getSourceImpl
(
)
;
const
ESCROW_DST_IMPLEMENTATION
=
await
dstFactory
.
getDestinationImpl
(
)
;
const
srcEscrowAddress
=
new
Sdk
.
EscrowFactory
(
new
Address
(
src
.
escrowFactory
)
,
)
.
getSrcEscrowAddress
(
srcEscrowEvent
[
0
]
,
ESCROW_SRC_IMPLEMENTATION
)
;
const
dstEscrowAddress
=
new
Sdk
.
EscrowFactory
(
new
Address
(
dst
.
escrowFactory
)
,
)
.
getDstEscrowAddress
(
srcEscrowEvent
[
0
]
,
srcEscrowEvent
[
1
]
,
dstDeployedAt
,
new
Address
(
resolverContract
.
dstAddress
)
,
ESCROW_DST_IMPLEMENTATION
,
)
;
Escrow verification and withdrawals
await
increaseTime
(
11
)
;
// User shares secret after validation of dst escrow deployment
console
.
log
(
`
[
${
dstChainId
}
]
`
,
`
Withdrawing funds for user from
${
dstEscrowAddress
}
`
,
)
;
await
dstChainResolver
.
send
(
resolverContract
.
withdraw
(
"dst"
,
dstEscrowAddress
,
secret
,
dstImmutables
.
withDeployedAt
(
dstDeployedAt
)
,
)
,
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Withdrawing funds for resolver from
${
srcEscrowAddress
}
`
,
)
;
const
{
txHash
:
resolverWithdrawHash
}
=
await
srcChainResolver
.
send
(
resolverContract
.
withdraw
(
"src"
,
srcEscrowAddress
,
secret
,
srcEscrowEvent
[
0
]
)
,
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Withdrew funds for resolver from
${
srcEscrowAddress
}
to
${
src
.
resolver
}
in tx
${
resolverWithdrawHash
}
`
,
)
;
const
resultBalances
=
await
getBalances
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
,
config
.
chain
.
destination
.
tokens
.
USDC
.
address
,
)
;
// User transferred funds to resolver on source chain
expect
(
initialBalances
.
src
.
user
-
resultBalances
.
src
.
user
)
.
toBe
(
order
.
makingAmount
,
)
;
expect
(
resultBalances
.
src
.
resolver
-
initialBalances
.
src
.
resolver
)
.
toBe
(
order
.
makingAmount
,
)
;
// Resolver transferred funds to user on destination chain
expect
(
resultBalances
.
dst
.
user
-
initialBalances
.
dst
.
user
)
.
toBe
(
order
.
takingAmount
,
)
;
expect
(
initialBalances
.
dst
.
resolver
-
resultBalances
.
dst
.
resolver
)
.
toBe
(
order
.
takingAmount
,
)
;
Partial fills
Creating the order
it
(
"should swap Ethereum USDC -> Bsc USDC. Multiple fills. Fill 100%"
,
async
(
)
=>
{
const
initialBalances
=
await
getBalances
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
,
config
.
chain
.
destination
.
tokens
.
USDC
.
address
)
;
// User creates order with 11 secrets (10 parts)
// note: use a cryptographically secure random number for real-life scenarios
const
secrets
=
Array
.
from
(
{
length
:
11
}
)
.
map
(
(
)
=>
uint8ArrayToHex
(
randomBytes
(
32
)
)
)
;
const
secretHashes
=
secrets
.
map
(
(
s
)
=>
Sdk
.
HashLock
.
hashSecret
(
s
)
)
;
const
leaves
=
Sdk
.
HashLock
.
getMerkleLeaves
(
secrets
)
;
const
order
=
Sdk
.
CrossChainOrder
.
new
(
new
Address
(
src
.
escrowFactory
)
,
{
salt
:
Sdk
.
randBigInt
(
1000n
)
,
maker
:
new
Address
(
await
srcChainUser
.
getAddress
(
)
)
,
makingAmount
:
parseUnits
(
"100"
,
6
)
,
takingAmount
:
parseUnits
(
"99"
,
6
)
,
makerAsset
:
new
Address
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
)
,
takerAsset
:
new
Address
(
config
.
chain
.
destination
.
tokens
.
USDC
.
address
)
}
,
{
hashLock
:
Sdk
.
HashLock
.
forMultipleFills
(
leaves
)
,
timeLocks
:
Sdk
.
TimeLocks
.
new
(
{
srcWithdrawal
:
10n
,
// 10s finality lock for test
srcPublicWithdrawal
:
120n
,
// 2m for private withdrawal
srcCancellation
:
121n
,
// 1sec public withdrawal
srcPublicCancellation
:
122n
,
// 1sec private cancellation
dstWithdrawal
:
10n
,
// 10s finality lock for test
dstPublicWithdrawal
:
100n
,
// 100sec private withdrawal
dstCancellation
:
101n
// 1sec public withdrawal
}
)
,
srcChainId
,
dstChainId
,
srcSafetyDeposit
:
parseEther
(
"0.001"
)
,
dstSafetyDeposit
:
parseEther
(
"0.001"
)
}
,
{
auction
:
new
Sdk
.
AuctionDetails
(
{
initialRateBump
:
0
,
points
:
[
]
,
duration
:
120n
,
startTime
:
srcTimestamp
}
)
,
whitelist
:
[
{
address
:
new
Address
(
src
.
resolver
)
,
allowFrom
:
0n
}
]
,
resolvingStartTime
:
0n
}
,
{
nonce
:
Sdk
.
randBigInt
(
UINT_40_MAX
)
,
allowPartialFills
:
true
,
allowMultipleFills
:
true
}
)
;
const
signature
=
await
srcChainUser
.
signOrder
(
srcChainId
,
order
)
;
const
orderHash
=
order
.
getOrderHash
(
srcChainId
)
;
Filling the order
// Resolver fills order
const
resolverContract
=
new
Resolver
(
src
.
resolver
,
dst
.
resolver
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Filling order
${
orderHash
}
`
)
;
const
fillAmount
=
order
.
makingAmount
;
const
idx
=
secrets
.
length
-
1
;
// last index to fulfill
const
{
txHash
:
orderFillHash
,
blockHash
:
srcDeployBlock
}
=
await
srcChainResolver
.
send
(
resolverContract
.
deploySrc
(
srcChainId
,
order
,
signature
,
Sdk
.
TakerTraits
.
default
(
)
.
setExtension
(
order
.
extension
)
.
setInteraction
(
new
Sdk
.
EscrowFactory
(
new
Address
(
src
.
escrowFactory
)
)
.
getMultipleFillInteraction
(
Sdk
.
HashLock
.
getProof
(
leaves
,
idx
)
,
idx
,
secretHashes
[
idx
]
)
)
.
setAmountMode
(
Sdk
.
AmountMode
.
maker
)
.
setAmountThreshold
(
order
.
takingAmount
)
,
fillAmount
,
Sdk
.
HashLock
.
fromString
(
secretHashes
[
idx
]
)
)
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Order
${
orderHash
}
filled for
${
fillAmount
}
in tx
${
orderFillHash
}
`
)
;
const
srcEscrowEvent
=
await
srcFactory
.
getSrcDeployEvent
(
srcDeployBlock
)
;
const
dstImmutables
=
srcEscrowEvent
[
0
]
.
withComplement
(
srcEscrowEvent
[
1
]
)
.
withTaker
(
new
Address
(
resolverContract
.
dstAddress
)
)
;
console
.
log
(
`
[
${
dstChainId
}
]
`
,
`
Depositing
${
dstImmutables
.
amount
}
for order
${
orderHash
}
`
)
;
const
{
txHash
:
dstDepositHash
,
blockTimestamp
:
dstDeployedAt
}
=
await
dstChainResolver
.
send
(
resolverContract
.
deployDst
(
dstImmutables
)
)
;
console
.
log
(
`
[
${
dstChainId
}
]
`
,
`
Created dst deposit for order
${
orderHash
}
in tx
${
dstDepositHash
}
`
)
;
const
secret
=
secrets
[
idx
]
;
const
ESCROW_SRC_IMPLEMENTATION
=
await
srcFactory
.
getSourceImpl
(
)
;
const
ESCROW_DST_IMPLEMENTATION
=
await
dstFactory
.
getDestinationImpl
(
)
;
const
srcEscrowAddress
=
new
Sdk
.
EscrowFactory
(
new
Address
(
src
.
escrowFactory
)
)
.
getSrcEscrowAddress
(
srcEscrowEvent
[
0
]
,
ESCROW_SRC_IMPLEMENTATION
)
;
const
dstEscrowAddress
=
new
Sdk
.
EscrowFactory
(
new
Address
(
dst
.
escrowFactory
)
)
.
getDstEscrowAddress
(
srcEscrowEvent
[
0
]
,
srcEscrowEvent
[
1
]
,
dstDeployedAt
,
new
Address
(
resolverContract
.
dstAddress
)
,
ESCROW_DST_IMPLEMENTATION
)
;
await
increaseTime
(
11
)
;
// finality lock passed
// User shares secret after validation of dst escrow deployment
console
.
log
(
`
[
${
dstChainId
}
]
`
,
`
Withdrawing funds for user from
${
dstEscrowAddress
}
`
)
;
await
dstChainResolver
.
send
(
resolverContract
.
withdraw
(
"dst"
,
dstEscrowAddress
,
secret
,
dstImmutables
.
withDeployedAt
(
dstDeployedAt
)
)
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Withdrawing funds for resolver from
${
srcEscrowAddress
}
`
)
;
const
{
txHash
:
resolverWithdrawHash
}
=
await
srcChainResolver
.
send
(
resolverContract
.
withdraw
(
"src"
,
srcEscrowAddress
,
secret
,
srcEscrowEvent
[
0
]
)
)
;
console
.
log
(
`
[
${
srcChainId
}
]
`
,
`
Withdrew funds for resolver from
${
srcEscrowAddress
}
to
${
src
.
resolver
}
in tx
${
resolverWithdrawHash
}
`
)
;
const
resultBalances
=
await
getBalances
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
,
config
.
chain
.
destination
.
tokens
.
USDC
.
address
)
;
// User transferred funds to resolver on the source chain
expect
(
initialBalances
.
src
.
user
-
resultBalances
.
src
.
user
)
.
toBe
(
order
.
makingAmount
)
;
expect
(
resultBalances
.
src
.
resolver
-
initialBalances
.
src
.
resolver
)
.
toBe
(
order
.
makingAmount
)
;
// Resolver transferred funds to user on destination chain
expect
(
resultBalances
.
dst
.
user
-
initialBalances
.
dst
.
user
)
.
toBe
(
order
.
takingAmount
)
;
expect
(
initialBalances
.
dst
.
resolver
-
resultBalances
.
dst
.
resolver
)
.
toBe
(
order
.
takingAmount
)
;
}
)
;
Order cancellation or public withdrawal
// ---- Order cancellation ----
describe
(
'Cancel'
,
(
)
=>
{
it
(
'should cancel swap Ethereum USDC -> Bsc USDC'
,
async
(
)
=>
{
const
initialBalances
=
await
getBalances
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
,
config
.
chain
.
destination
.
tokens
.
USDC
.
address
)
// User creates order
// note: use a cryptographically secure random number for real-life scenarios
const
hashLock
=
Sdk
.
HashLock
.
forSingleFill
(
uint8ArrayToHex
(
randomBytes
(
32
)
)
)
const
order
=
Sdk
.
CrossChainOrder
.
new
(
new
Address
(
src
.
escrowFactory
)
,
{
salt
:
Sdk
.
randBigInt
(
1000n
)
,
maker
:
new
Address
(
await
srcChainUser
.
getAddress
(
)
)
,
makingAmount
:
parseUnits
(
'100'
,
6
)
,
takingAmount
:
parseUnits
(
'99'
,
6
)
,
makerAsset
:
new
Address
(
config
.
chain
.
source
.
tokens
.
USDC
.
address
)
,
takerAsset
:
new
Address
(
config
.
chain
.
destination
.
tokens
.
USDC
.
address
)
}
,
{
hashLock
,
timeLocks
:
Sdk
.
TimeLocks
.
new
(
{
srcWithdrawal
:
0n
,
// no finality lock for test
srcPublicWithdrawal
:
Previous
Initializing farm reward distribution
Next
SDK Overview
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
SDK Overview
When and how to submit a secret
For resolvers
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
SDK Overview
When and how to submit a secret
For resolvers
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
When and how to submit a secret
How to submit a secret
Wait for finality lock and escrow creation
After the escrows are created on both the source and destination chains, the finality lock period must expire before the secret is shared.
Use
getReadyToAcceptSecretFills(orderHash)
to check if the secret can be submitted, meaning both escrows are in place, and finality locks have passed.
async
getReadyToAcceptSecretFills
(
orderHash
:
string
)
:
Promise
<
ReadyToAcceptSecretFills
>
{
return
this
.
api
.
getReadyToAcceptSecretFills
(
orderHash
)
}
Check if the order is ready for public actions
Next, call
getReadyToExecutePublicActions()
to verify if the system is ready to perform public actions, including secret submission. This step ensures that public events such as secret reveals can proceed.
async
getReadyToExecutePublicActions
(
)
:
Promise
<
ReadyToExecutePublicActions
>
{
return
this
.
api
.
getReadyToExecutePublicActions
(
)
}
Verify if a secret has already been published
Use
getPublishedSecrets(orderHash)
to check which secrets has already been revealed by other resolvers. If a valid secret is already published, further action may not be needed.
async
getPublishedSecrets
(
orderHash
:
string
)
:
Promise
<
PublishedSecretsResponse
>
{
return
this
.
api
.
getPublishedSecrets
(
orderHash
)
}
How to Submit a secret
Ensure the secret is ready
The maker must have the secret stored securely and be ready to provide it after finality lock expiration. For example, in the 1inch dApp interface, the secret is stored in the user's browser. To provide the secret, they must keep the browser tab open.
Submit the secret
Use
submitSecret(orderHash, secret)
to submit the secret for the given order.
Pass the correct
orderHash
and
secret
in this function to complete the submission process.
This secret will be used to unlock the escrows and finalize the swap.
async
submitSecret
(
orderHash
:
string
,
secret
:
string
)
:
Promise
<
void
>
{
return
this
.
api
.
submitSecret
(
orderHash
,
secret
)
}
Verify successful submission
After submitting the secret, ensure it has been successfully accepted by using
getOrderStatus(orderHash)
to check the order status. A successful secret submission will allow resolvers to complete the swap and release funds from both escrows.
Previous
SDK Overview
Next
Auction calculator
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use



---


# 5. Withdrawal Phase


---


# 6. Relayer / Resolver

## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Resolver verification
Prior to registering as a resolver, each individual or company is required to pass a verification procedure.
The aim of the verification is to provide a safe and transparent environment within the 1inch Network. Verification ensures that each resolver is a trustworthy actor within the network, increasing user confidence and trust. Additionally, verification is necessary for the resolver to receive relevant rewards.
Essentially, verification involves completing an
identifying KYC (know-your-client) or KYB (know-your-business process) questionnaire
. The process is slightly different for individuals and entities, but in both cases it is straightforward. It involves answering several questions and uploading basic identifying documents.
Previous
Terms of Use for Resolvers
Next
Initializing farm reward distribution
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Terms of Use for Resolvers
Resolver verification
Initializing farm reward distribution
Fusion+ test examples
Fusion+ SDK
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Initializing farm reward distribution
Overview
As a resolver, offering farm incentives to delegators can help increase your Unicorn Power balance and consequently, your probability of filling orders. Upon registering as a resolver, the farm contract is automatically deployed. You can fetch the farm by interacting with the
dst1inch
contract’s ABI. Note that you can reward delegators with any ERC20 token, not only tokens from the incentive program.
How to fetch a farm with the
dst1inch
contract
Go to the
Read Contract
section of the
dst1inch
contract
on Etherscan.
Under the
defaultFarms
method, enter your resolver address within the
address
parameter and send the call.
Click the returned farm contract address and navigate to the
Write Contract
section of the returned contract page. This is your newly generated farm distribution address.
Call the
setDistributor
method using the address that will be managing and distributing rewards.
On the same contract, call
addRewardsToken
with the desired token address that will be distributed to your delegators.
Lastly, on the same contract, call
startFarming
, entering the
rewardsToken
address, amount, and period (both amount and period are uint256). Once called, your farm will have started, and rewards will begin to be distributed to your delegators.
How to replenish farming token balance (optional)
To replenish the token balance of your farm rewards, call
addRewardsToken
and
startFarming
to the farm contract as done in the initial setup.
Example ABI interaction
The example script below reads ABI definitions for both the
dst1inch
and
multiFarmingPod
contracts.
Create two new files and add the ABI definitions which can be found at the following URLs:
dst1inchABI.json
abi.json
Replace
YourAPIKey
with your actual Etherscan API key at the end of each linked URL above.
require
(
"dotenv"
)
.
config
(
)
;
//for accessing sensitive information such as private keys, API keys, etc.
const
{
Web3
}
=
require
(
"web3"
)
;
const
web3
=
new
Web3
(
`
Your_ethereum_RPC
`
)
;
const
fs
=
require
(
'fs'
)
;
const
dst1inchABI
=
JSON
.
parse
(
fs
.
readFileSync
(
'dst1inchABI.json'
,
'utf8'
)
)
;
const
farmABI
=
JSON
.
parse
(
fs
.
readFileSync
(
'abi.json'
,
'utf8'
)
)
;
*
const
erc20Abi
=
[
// ERC20 ABI fragment (for contract approval)
{
"constant"
:
false
,
"inputs"
:
[
{
"name"
:
"spender"
,
"type"
:
"address"
}
,
{
"name"
:
"value"
,
"type"
:
"uint256"
}
]
,
"name"
:
"approve"
,
"outputs"
:
[
{
"name"
:
""
,
"type"
:
"bool"
}
]
,
"payable"
:
false
,
"stateMutability"
:
"nonpayable"
,
"type"
:
"function"
}
]
;
const
dst1inch
=
"0xAccfAc2339e16DC80c50d2fa81b5c2B049B4f947"
;
const
dst1inchContract
=
new
web3
.
eth
.
Contract
(
dst1inchABI
,
dst1inch
)
;
const
account
=
'YOUR_REGISTERED_ADDRESS'
;
const
privateKey
=
'YOUR_PRIVATE_KEY'
;
async
function
distributeFarmingRewards
(
resolverAddress
,
newDistributor
,
rewardsToken
,
amount
,
period
)
{
try
{
// Call defaultFarms with your resolver address
const
farmAddress
=
await
dst1inchContract
.
methods
.
defaultFarms
(
resolverAddress
)
.
call
(
)
;
console
.
log
(
`
Farm address:
${
farmAddress
}
`
)
;
const
farmContract
=
new
web3
.
eth
.
Contract
(
farmABI
,
farmAddress
)
;
const
tokenContract
=
new
web3
.
eth
.
Contract
(
erc20Abi
,
rewardsToken
)
;
// Call setDistributor on the returned farm address
const
setDistributorTx
=
{
from
:
resolverAddress
,
to
:
farmAddress
,
data
:
farmContract
.
methods
.
setDistributor
(
newDistributor
)
.
encodeABI
(
)
,
}
;
const
setDistributorSignedTx
=
await
web3
.
eth
.
accounts
.
signTransaction
(
setDistributorTx
,
privateKey
)
;
await
web3
.
eth
.
sendSignedTransaction
(
setDistributorSignedTx
.
rawTransaction
)
;
console
.
log
(
"Distributor set successfully"
)
;
// Approve the farm contract to spend the tokens
const
approveTx
=
{
from
:
newDistributor
,
to
:
rewardsToken
,
data
:
tokenContract
.
methods
.
approve
(
farmAddress
,
amount
)
.
encodeABI
(
)
,
}
;
const
approveSignedTx
=
await
web3
.
eth
.
accounts
.
signTransaction
(
approveTx
,
privateKey
)
;
await
web3
.
eth
.
sendSignedTransaction
(
approveSignedTx
.
rawTransaction
)
;
console
.
log
(
"Approval transaction confirmed"
)
;
// Call addRewardsToken with the address of distribution token
const
addRewardsTokenTx
=
{
from
:
newDistributor
,
to
:
farmAddress
,
data
:
farmContract
.
methods
.
addRewardsToken
(
rewardsToken
)
.
encodeABI
(
)
,
}
;
const
addRewardsTokenSignedTx
=
await
web3
.
eth
.
accounts
.
signTransaction
(
addRewardsTokenTx
,
privateKey
)
;
await
web3
.
eth
.
sendSignedTransaction
(
addRewardsTokenSignedTx
.
rawTransaction
)
;
console
.
log
(
"Rewards token added successfully"
)
;
// Call startFarming(address rewardsToken, uint256 amount, uint256 period)
const
startFarmingTx
=
{
from
:
newDistributor
,
to
:
farmAddress
,
data
:
farmContract
.
methods
.
startFarming
(
rewardsToken
,
amount
,
period
)
.
encodeABI
(
)
,
}
;
const
startFarmingSignedTx
=
await
web3
.
eth
.
accounts
.
signTransaction
(
startFarmingTx
,
privateKey
)
;
await
web3
.
eth
.
sendSignedTransaction
(
startFarmingSignedTx
.
rawTransaction
)
;
console
.
log
(
"Farming started successfully"
)
;
}
catch
(
error
)
{
console
.
error
(
"Error distributing farming rewards:"
,
error
)
;
}
}
const
resolverAddress
=
account
;
const
newDistributor
=
account
;
// you can use any address as the distributor
const
rewardsToken
=
'0xRewardsTokenAddress'
;
const
amount
=
web3
.
utils
.
toWei
(
"Amount"
,
"Token Name"
)
;
// Amount of rewards tokens
const
period
=
3600
;
// Period in seconds
distributeFarmingRewards
(
resolverAddress
,
newDistributor
,
rewardsToken
,
amount
,
period
)
.
then
(
(
)
=>
console
.
log
(
"Farming rewards distributed successfully"
)
)
.
catch
(
(
error
)
=>
console
.
error
(
"Error distributing farming rewards:"
,
error
)
)
;
info
Have questions? Reach out to us in the live support chat!
Previous
Resolver verification
Next
Fusion+ test examples
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
SDK Overview
When and how to submit a secret
For resolvers
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
SDK Overview
When and how to submit a secret
For resolvers
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
SDK Overview
This example provides high level functionality to working with the 1inch Fusion+ SDK:
Initialization
import
{
SDK
,
NetworkEnum
}
from
"@1inch/cross-chain-sdk"
;
async
function
main
(
)
{
const
sdk
=
new
SDK
(
{
url
:
"https://api.1inch.dev/fusion-plus"
,
authKey
:
"your-auth-key"
,
}
)
;
const
orders
=
await
sdk
.
getActiveOrders
(
{
page
:
1
,
limit
:
2
}
)
;
}
main
(
)
;
Creation
Constructor arguments
params: CrossChainSDKConfigParams
interface
HttpProviderConnector
{
get
<
T
>
(
url
:
string
)
:
Promise
<
T
>
;
post
<
T
>
(
url
:
string
,
data
:
unknown
)
:
Promise
<
T
>
;
}
interface
BlockchainProviderConnector
{
signTypedData
(
walletAddress
:
string
,
typedData
:
EIP712TypedData
,
)
:
Promise
<
string
>
;
ethCall
(
contractAddress
:
string
,
callData
:
string
)
:
Promise
<
string
>
;
}
type
CrossChainSDKConfigParams
=
{
url
:
string
;
blockchainProvider
?
:
BlockchainProviderConnector
;
httpProvider
?
:
HttpProviderConnector
;
// by default we are using axios
}
;
Example with custom httpProvider
import
{
api
}
from
"my-api-lib"
;
class
CustomHttpProvider
implements
HttpProviderConnector
{
get
<
T
>
(
url
:
string
)
:
Promise
<
T
>
{
return
api
.
get
(
url
)
;
}
post
<
T
>
(
url
:
string
,
data
:
unknown
)
:
Promise
<
T
>
{
return
api
.
post
(
url
,
data
)
;
}
}
Methods
getActiveOrders
Description:
used to get the list of active orders
Arguments:
[0] PaginationParams
Example
import
{
SDK
,
NetworkEnum
}
from
"@1inch/cross-chain-sdk"
;
const
sdk
=
new
SDK
(
{
url
:
"https://api.1inch.dev/fusion-plus"
,
authKey
:
"your-auth-key"
,
}
)
;
const
orders
=
await
sdk
.
getActiveOrders
(
{
page
:
1
,
limit
:
2
}
)
;
getOrdersByMaker
Description
used to get orders by maker
Arguments
[0] params: PaginationParams & {address: string}
Example
import
{
SDK
,
NetworkEnum
}
from
"@1inch/cross-chain-sdk"
;
const
sdk
=
new
FusionSDK
(
{
url
:
"https://api.1inch.dev/fusion-plus"
,
authKey
:
"your-auth-key"
,
}
)
;
const
orders
=
await
sdk
.
getOrdersByMaker
(
{
page
:
1
,
limit
:
2
,
address
:
"0xfa80cd9b3becc0b4403b0f421384724f2810775f"
,
}
)
;
getQuote
Description:
Get quote details based on input data
Arguments:
[0] params: QuoteParams
Example:
import
{
SDK
,
NetworkEnum
,
QuoteParams
}
from
"@1inch/cross-chain-sdk"
;
const
sdk
=
new
FusionSDK
(
{
url
:
"https://api.1inch.dev/fusion-plus"
,
authKey
:
"your-auth-key"
,
}
)
;
const
params
=
{
srcChainId
:
NetworkEnum
.
ETHEREUM
,
dstChainId
:
NetworkEnum
.
GNOSIS
,
srcTokenAddress
:
"0x6b175474e89094c44da98b954eedeac495271d0f"
,
dstTokenAddress
:
"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
,
amount
:
"1000000000000000000000"
,
walletAddress
:
"0x123...."
,
}
;
const
quote
=
await
sdk
.
getQuote
(
params
)
;
createOrder
Description:
used to create a cross chain order by given quote
Arguments:
[0] quote: Quote
[1] params: OrderParams
Example:</b<
import
{
getRandomBytes32
,
SDK
,
HashLock
,
PrivateKeyProviderConnector
,
NetworkEnum
,
}
from
"@1inch/cross-chain-sdk"
;
const
makerPrivateKey
=
"0x123...."
;
const
makerAddress
=
"0x123...."
;
const
nodeUrl
=
"...."
;
const
blockchainProvider
=
new
PrivateKeyProviderConnector
(
makerPrivateKey
,
new
Web3
(
nodeUrl
)
,
)
;
const
sdk
=
new
SDK
(
{
url
:
"https://api.1inch.dev/fusion-plus"
,
authKey
:
"your-auth-key"
,
blockchainProvider
,
}
)
;
const
params
=
{
srcChainId
:
NetworkEnum
.
ETHEREUM
,
dstChainId
:
NetworkEnum
.
GNOSIS
,
srcTokenAddress
:
"0x6b175474e89094c44da98b954eedeac495271d0f"
,
dstTokenAddress
:
"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
,
amount
:
"1000000000000000000000"
,
enableEstimate
:
true
,
walletAddress
:
makerAddress
,
}
;
const
quote
=
await
sdk
.
getQuote
(
params
)
;
const
secretsCount
=
quote
.
getPreset
(
)
.
secretsCount
;
const
secrets
=
Array
.
from
(
{
length
:
secretsCount
}
)
.
map
(
(
)
=>
getRandomBytes32
(
)
,
)
;
const
secretHashes
=
secrets
.
map
(
(
x
)
=>
HashLock
.
hashSecret
(
x
)
)
;
const
hashLock
=
secretsCount
===
1
?
HashLock
.
forSingleFill
(
secrets
[
0
]
)
:
HashLock
.
forMultipleFills
(
secretHashes
.
map
(
(
secretHash
,
i
)
=>
solidityPackedKeccak256
(
[
"uint64"
,
"bytes32"
]
,
[
i
,
secretHash
.
toString
(
)
]
,
)
,
)
as
(
string
&
{
_tag
:
"MerkleLeaf"
;
}
)
[
]
,
)
;
sdk
.
createOrder
(
quote
,
{
walletAddress
:
makerAddress
,
hashLock
,
secretHashes
,
// fee is an optional field
fee
:
{
takingFeeBps
:
100
,
// 1% as we use bps format, 1% is equal to 100bps
takingFeeReceiver
:
"0x0000000000000000000000000000000000000000"
,
//  fee receiver address
}
,
}
)
.
then
(
console
.
log
)
;
Types
PaginationParams
type
PaginationParams
=
{
page
?
:
number
;
// default is 1
limit
?
:
number
;
// default is 2, min is 1, max is 500
}
;
QuoteParams
type
QuoteParams
=
{
fromTokenAddress
:
string
;
toTokenAddress
:
string
;
amount
:
string
;
permit
?
:
string
;
// a permit (EIP-2612) call data, user approval sign
takingFeeBps
?
:
number
;
// 100 == 1%
}
;
OrderParams
enum
PresetEnum
{
fast
=
"fast"
,
medium
=
"medium"
,
slow
=
"slow"
,
}
type
OrderParams
=
{
fromTokenAddress
:
string
;
toTokenAddress
:
string
;
amount
:
string
;
walletAddress
:
string
;
permit
?
:
string
;
// a permit (EIP-2612) call data, user approval sign
receiver
?
:
string
;
// address
preset
?
:
PresetEnum
;
nonce
?
:
OrderNonce
|
string
|
number
;
// allows to batch cancel orders. by default: not used
fee
?
:
TakingFeeInfo
;
}
;
export
type
TakingFeeInfo
=
{
takingFeeBps
:
number
;
// 100 == 1%
takingFeeReceiver
:
string
;
}
;
Previous
Fusion+ test examples
Next
When and how to submit a secret
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Auction calculator
This method is used to calculate taker amount and auction rate.
Example
import
{
AuctionCalculator
}
from
"@1inch/fusion-sdk"
;
const
limitOrderStruct
=
{
allowedSender
:
"0x0000000000000000000000000000000000000000"
,
interactions
:
"0x000c004e200000000000000000219ab540356cbb839cbe05303d7705faf486570009"
,
maker
:
"0x00000000219ab540356cbb839cbe05303d7705fa"
,
makerAsset
:
"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
,
makingAmount
:
"1000000000000000000"
,
offsets
:
"0"
,
receiver
:
"0x0000000000000000000000000000000000000000"
,
salt
:
"45118768841948961586167738353692277076075522015101619148498725069326976558864"
,
takerAsset
:
"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
,
takingAmount
:
"1420000000"
,
}
;
const
calculator
=
AuctionCalculator
.
fromLimitOrderV3Struct
(
limitOrderStruct
)
;
// #=> AuctionCalculator instance
const
rate
=
calculator
.
calcRateBump
(
1673548209
)
;
// #=> 14285
const
auctionTakingAmount
=
calculator
.
calcAuctionTakingAmount
(
"1420000000"
,
rate
,
)
;
// #=> '1422028470'
static AuctionCalculator.fromLimitOrderV3Struct
This method is used to create an auction instance from a limit order.
Arguments:
LimitOrderV3Struct
Name
Type
Inner Solidity type
Description
salt
string
uint256
Some unique value. It is necessary to be able to create limit orders with the same parameters (so that they have a different hash).
makerAsset
string
address
The address of the asset user wants to sell (address of a token contract).
takerAsset
string
address
The address of the asset user wants to buy (address of a token contract).
maker
string
address
The address of the limit order creator.
receiver
string
address
If it contains a zero address, it means that taker asset will be sent to the address of the creator of the limit order. If a user set any other value, then taker asset will be sent to the specified address.
allowedSender
string
address
If it contains a zero address, it means that a limit order is available for everyone to fill. If a user set any other value, then the limit order will be available for execution only for the specified address (private limit order).
makingAmount
string
uint256
Amount of maker asset.
takingAmount
string
uint256
Amount of taker asset.
offsets
string
uint256
Every 32's bytes represents offset of the n'ths interaction.
interactions
string
bytes
Used to encode Fusion-specific data.
Order interactions suffix structure:
M*(1 + 3 bytes) - auction points coefficients with seconds delays.
N*(4 + 20 bytes) - resolver with corresponding time limit.
4 bytes - public time limit (starting from this point of time, an order can be fullfilled by anyone).
32 bytes - taking fee (optional
if
flags have
\_HAS_TAKING_FEE_FLAG
).
1 byte - flags.
Example:
import
{
AuctionCalculator
}
from
"@1inch/fusion-sdk"
;
const
limitOrderStruct
=
{
allowedSender
:
"0x0000000000000000000000000000000000000000"
,
interactions
:
"0x000c004e200000000000000000219ab540356cbb839cbe05303d7705faf486570009"
,
maker
:
"0x00000000219ab540356cbb839cbe05303d7705fa"
,
makerAsset
:
"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
,
makingAmount
:
"1000000000000000000"
,
offsets
:
"0"
,
receiver
:
"0x0000000000000000000000000000000000000000"
,
salt
:
"45118768841948961586167738353692277076075522015101619148498725069326976558864"
,
takerAsset
:
"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
,
takingAmount
:
"1420000000"
,
}
;
AuctionCalculator
.
fromLimitOrderV3Struct
(
limitOrderStruct
)
;
// #=> AuctionCalculator instance
AuctionCalculator.calcRateBump
This method is used to calculate exchange rate at some point of time. To learn more about it, read
Fusion swap: Introduction
.
Arguments:
time
(Unix timestamp)
AuctionCalculator.calcAuctionTakingAmount
This method is used to calculate taker amount.
Arguments:
takingAmount: string
rate: number
AuctionCalculator.fromAuctionData
This method is used to create
AuctionCalculator
from suffix and salt.
Arguments:
suffix
:
AuctionSuffix
salt
:
AuctionSalt
Example:
import
{
AuctionSuffix
,
AuctionSalt
,
AuctionCalculator
,
}
from
"@1inch/fusion-sdk"
;
const
suffix
=
AuctionSuffix
.
decode
(
"0x000c004e200000000000000000219ab540356cbb839cbe05303d7705faf486570009"
,
)
;
const
salt
=
AuctionSalt
.
decode
(
"45118768841948961586167738353692277076075522015101619148498725069326976558864"
,
)
;
AuctionCalculator
.
fromAuctionData
(
suffix
,
salt
)
;
// #=> AuctionCalculator instance
Previous
When and how to submit a secret
Next
Auction salt
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Auction salt
This parameters includes:
Auction start time
Duration of an auction
Initial rate bump
Taker fee
Salt (optional parameter to control entropy)
Example 1
import
{
AuctionSalt
}
from
'@1inch/fusion-sdk'
const
salt
=
new
AuctionSalt
(
{
duration
:
180
// in seconds,
auctionStartTime
:
1673548149
// Unix timestamp,
initialRateBump
:
50000
// difference between max and min amount in percents, 10000000 = 100%
bankFee
:
'0'
// in wei
}
)
salt
.
build
(
)
// #=> '45118768841948961586167738353692277076075522015101619148498725069326976549864'
Example 2: Using an optional parameter to control entropy
import
{
AuctionSalt
}
from
'@1inch/fusion-sdk'
// your random generated string
const
saltString
=
myCustomRandFunction
(
)
const
salt
=
new
AuctionSalt
(
{
duration
:
180
// in seconds,
auctionStartTime
:
1673548149
// Unix timestamp,
initialRateBump
:
50000
// 10000000 = 100%
bankFee
:
'0'
// in wei,
salt
:
saltString
}
)
salt
.
build
(
)
static AuctionSalt.decode
Arguments:
string
import
{
AuctionSalt
}
from
"@1inch/fusion-sdk"
;
const
salt
=
AuctionSalt
.
decode
(
"45118768841948961586167738353692277076075522015101619148498725069326976549864"
,
)
;
// #=> AuctionSalt
Previous
Auction calculator
Next
Auction suffix
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Auction suffix
Arguments:
suffix:
SettlementSuffixData
type
AuctionPoint
=
{
delay
:
number
;
// point in time of this point relatively to previous point
coefficient
:
number
;
// coefficient rate bump from the end of an auction
}
;
type
AuctionWhitelistItem
=
{
address
:
string
;
allowance
:
number
;
// seconds
}
;
type
SettlementSuffixData
=
{
points
:
AuctionPoint
[
]
;
// represents auction points with rates and delays
whitelist
:
AuctionWhitelistItem
[
]
;
// combination of the resolver address and allowance in seconds, which represents when the resolver can start full fill the order
publicResolvingDeadline
?
:
number
;
// represents time in seconds when the order started to be public (can be filled by any one)
takerFeeReceiver
?
:
string
;
// address of the fee receiver
takerFeeRatio
?
:
string
;
// taker ratio, 10000000 = 1%
}
;
Example:
import
{
AuctionSuffix
}
from
"@1inch/fusion-sdk"
;
const
suffix
=
new
AuctionSuffix
(
{
points
:
[
{
coefficient
:
20000
,
delay
:
12
,
}
,
]
,
whitelist
:
[
{
address
:
"0x00000000219ab540356cbb839cbe05303d7705fa"
,
allowance
:
0
,
}
,
]
,
}
)
;
suffix
.
build
(
)
;
// #=> '000c004e200000000000000000219ab540356cbb839cbe05303d7705faf486570009'
static AuctionSuffix.decode
Arguments:
interactions: string
Example:
import
{
AuctionSuffix
}
from
"@1inch/fusion-sdk"
;
const
encodedSuffix
=
"000c004e200000000000000000219ab540356cbb839cbe05303d7705fa63c0566a09"
;
const
suffix
=
AuctionSuffix
.
decode
(
encodedSuffix
)
;
suffix
.
build
(
)
;
// #=> '000c004e200000000000000000219ab540356cbb839cbe05303d7705fa63c0566a09'
Previous
Auction salt
Next
Websocket API
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use


## Documentation Section

Dev Portal | documentation
Docs
Pricing & Features
Sign In
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Articles
Overview
APIs
Authentication
Swap APIs
Overview
Cross-Chain Swaps (Fusion+)
Introduction
Swagger
Becoming a resolver
Fusion+ SDK
For integrators
For resolvers
Auction calculator
Auction salt
Auction suffix
Websocket API
Intent Swaps (Fusion)
Classic Swap
Orderbook API
History API
Traces API
Portfolio API
Balance API
Gas Price API
Spot Price API
Token API
NFT API
Transaction Gateway API
Web3 RPC API
Charts API
Domains API
Token Details API
Contracts
FAQ
Websocket API
A high-level overview of working with 1inch Fusion+ orders.
Example
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
wsSdk
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
authKey
:
"your-auth-key"
,
}
)
;
wsSdk
.
order
.
onOrder
(
(
data
)
=>
{
console
.
log
(
"received order event"
,
data
)
;
}
)
;
Creation
Creation with a constructor
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
authKey
:
"your-auth-key"
,
}
)
;
Creation with a custom provider
You can provide a custom provider for WebSocket. By default, 1inch uses
ws library
.
import
{
WsProviderConnector
,
WebSocketApi
}
from
"@1inch/fusion-sdk"
;
class
MyFancyProvider
implements
WsProviderConnector
{
// ... user implementation
}
const
url
=
"wss://api.1inch.dev/fusion/ws/v2.0/1"
;
const
provider
=
new
MyFancyProvider
(
{
url
}
)
;
const
wsSdk
=
new
WebSocketApi
(
provider
)
;
Creation with a new static method
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/cross-chain-sdk"
;
const
ws
=
WebSocketApi
.
new
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
Creation with lazy initialization
By default, when you create an instance of
WebSocketApi
, it automatically opens a WebSocket connection, which might be a problem in some cases. To avoid this, you can enable lazy initializations.
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/cross-chain-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
lazyInit
:
true
,
}
)
;
ws
.
init
(
)
;
Base methods
on
This method is used to subscribe to any event.
Arguments:
[0]
event: string
[1]
cb: Function
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
on
(
WebSocketEvent
.
Error
,
console
.
error
)
;
ws
.
on
(
WebSocketEvent
.
Open
,
function
open
(
)
{
ws
.
send
(
"something"
)
;
}
)
;
ws
.
on
(
WebSocketEvent
.
Message
,
function
message
(
data
)
{
console
.
log
(
"received: %s"
,
data
)
;
}
)
;
off
*This method is used to unsubscribe from any event.
Arguments:
[0]
event: string
[1]
сb: Function
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
on
(
WebSocketEvent
.
Error
,
console
.
error
)
;
ws
.
on
(
WebSocketEvent
.
Open
,
function
open
(
)
{
ws
.
send
(
"something"
)
;
}
)
;
function
message
(
data
)
{
console
.
log
(
"received: %s"
,
data
)
;
}
ws
.
on
(
WebSocketEvent
.
Message
,
message
)
;
ws
.
off
(
WebSocketEvent
.
Message
,
message
)
;
onOpen
This method is used to subscribe to an open event.
Arguments:
[0]
cb: Function
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
onOpen
(
(
)
=>
{
console
.
log
(
"connection is opened"
)
;
}
)
;
send
This method is used to send an event to backend.
Arguments:
[0]
message
: any message which can be serialized with
JSON.stringify
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
send
(
"my message"
)
;
close
Description
: close connection
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
close
(
)
;
onMessage
This method is used to subscribe to a message event.
Arguments:
[0]
cb: (data: any) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
onMessage
(
(
data
)
=>
{
console
.
log
(
"message received"
,
data
)
;
}
)
;
onClose
This method is used to subscribe to a close event.
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
onClose
(
(
)
=>
{
console
.
log
(
"connection is closed"
)
;
}
)
;
onError
This method is used to subscribe to an error event.
Arguments:
[0]
cb: (error: any) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
onError
(
(
error
)
=>
{
console
.
log
(
"error is received"
,
error
)
;
}
)
;
Order namespace methods
onOrder
This method is used to subscribe to order events.
Arguments:
[0]
cb: (data: OrderEventType) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
order
.
onOrder
(
(
data
)
=>
{
if
(
data
.
event
===
"order_created"
)
{
// do something
}
if
(
data
.
event
===
"order_invalid"
)
{
// do something
}
}
)
;
onOrderCreated
This method is used to subscribe to the
order_created
events.
Arguments:
[0]
cb: (data: OrderCreatedEvent) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
order
.
onOrderCreated
(
(
data
)
=>
{
// do something
}
)
;
onOrderInvalid
This method is used to subscribe to the
order_invalid
events.
Arguments:
[0]
cb: (data: OrderInvalidEvent) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
order
.
onOrderInvalid
(
(
data
)
=>
{
// do something
}
)
;
onOrderBalanceOrAllowanceChange
This method is used to subscribe to the
order_balance_or_allowance_change
events.
Arguments:
[0]
cb: (data: OrderBalanceOrAllowanceChangeEvent) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
order
.
onOrderBalanceOrAllowanceChange
(
(
data
)
=>
{
// do something
}
)
;
onOrderFilled
This method is used to subscribe to the
order_filled
events.
Arguments:
[0]
cb: (data: OrderFilledEvent) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
order
.
onOrderFilled
(
(
data
)
=>
{
// do something
}
)
;
onOrderFilledPartially
This method is used to subscribe to the
order_filled_partially
events.
Arguments:
[0]
cb: (data: OrderFilledPartiallyEvent) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
order
.
onOrderFilledPartially
(
(
data
)
=>
{
// do something
}
)
;
onOrderCancelled
This method is used to subscribe to the
order_cancelled
events.
Arguments:
[0]
cb: (data: OrderCancelledEvent) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
order
.
onOrderCancelled
(
(
data
)
=>
{
// do something
}
)
;
RPC namespace methods
onPong
This method is used to subscribe to ping response.
Arguments:
[0]
cb: (data: string) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
rpc
.
onPong
(
(
data
)
=>
{
// do something
}
)
;
ping
This method is used to ping healthcheck.
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
rpc
.
ping
(
)
;
getAllowedMethods
This method is used to get the list of allowed methods.
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
rpc
.
getAllowedMethods
(
)
;
onGetAllowedMethods
This method is used to subscribe to get the allowed methods response.
Arguments:
[0]
cb: (data: RpcMethod[]) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
rpc
.
onGetAllowedMethods
(
(
data
)
=>
{
// do something
}
)
;
getActiveOrders
This method is used to get the list of active orders.
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
rpc
.
getActiveOrders
(
)
;
onGetActiveOrders
This method is used to subscribe to get active orders events.
Arguments:
[0]
cb: (data: PaginationOutput\<ActiveOrder\>) => void
Example:
import
{
WebSocketApi
,
NetworkEnum
}
from
"@1inch/fusion-sdk"
;
const
ws
=
new
WebSocketApi
(
{
url
:
"wss://api.1inch.dev/fusion/ws"
,
network
:
NetworkEnum
.
ETHEREUM
,
}
)
;
ws
.
rpc
.
onGetActiveOrders
(
(
data
)
=>
{
// do something
}
)
;
Types
OrderEventType
import
{
OrderType
}
from
"./types"
;
type
Event
<
K
extends
string
,
T
>
=
{
event
:
K
;
data
:
T
}
;
export
type
OrderEventType
=
|
OrderCreatedEvent
|
OrderInvalidEvent
|
OrderBalanceChangeEvent
|
OrderAllowanceChangeEvent
|
OrderFilledEvent
|
OrderFilledPartiallyEvent
|
OrderCancelledEvent
|
OrderSecretSharedEvent
;
export
enum
EventType
{
OrderCreated
=
"order_created"
,
OrderInvalid
=
"order_invalid"
,
OrderBalanceChange
=
"order_balance_change"
,
OrderAllowanceChange
=
"order_allowance_change"
,
OrderFilled
=
"order_filled"
,
OrderFilledPartially
=
"order_filled_partially"
,
OrderCancelled
=
"order_cancelled"
,
OrderSecretShared
=
"secret_shared"
,
}
type
OrderCreatedEvent
=
Event
<
"order_created"
,
{
orderHash
:
string
;
signature
:
string
;
order
:
LimitOrderV3Struct
;
deadline
:
string
;
auctionStartDate
:
string
;
auctionEndDate
:
string
;
remainingMakerAmount
:
string
;
}
>
;
export
type
OrderCreatedEvent
=
Event
<
EventType
.
OrderCreated
,
{
srcChainId
:
SupportedChain
;
dstChainId
:
SupportedChain
;
orderHash
:
string
;
order
:
LimitOrderV4Struct
;
extension
:
string
;
signature
:
string
;
isMakerContract
:
boolean
;
quoteId
:
string
;
merkleLeaves
:
string
[
]
;
secretHashes
:
string
[
]
;
}
>
;
export
type
OrderBalanceChangeEvent
=
Event
<
EventType
.
OrderBalanceChange
,
{
orderHash
:
string
;
remainingMakerAmount
:
string
;
balance
:
string
;
}
>
;
export
type
OrderAllowanceChangeEvent
=
Event
<
EventType
.
OrderAllowanceChange
,
{
orderHash
:
string
;
remainingMakerAmount
:
string
;
allowance
:
string
;
}
>
;
type
OrderInvalidEvent
=
Event
<
EventType
.
OrderInvalid
,
{
orderHash
:
string
;
}
>
;
export
type
OrderCancelledEvent
=
Event
<
EventType
.
OrderCancelled
,
{
orderHash
:
string
;
remainingMakerAmount
:
string
;
}
>
;
type
OrderFilledEvent
=
Event
<
EventType
.
OrderFilled
,
{
orderHash
:
string
}
>
;
type
OrderFilledPartiallyEvent
=
Event
<
EventType
.
OrderFilledPartially
,
{
orderHash
:
string
;
remainingMakerAmount
:
string
}
>
;
export
type
OrderSecretSharedEvent
=
Event
<
EventType
.
OrderSecretShared
,
{
idx
:
number
;
secret
:
string
;
srcImmutables
:
Jsonify
<
Immutables
>
;
dstImmutables
:
Jsonify
<
Immutables
>
;
}
>
;
RpcMethod
export
enum
RpcMethod
{
GetAllowedMethods
=
"getAllowedMethods"
,
Ping
=
"ping"
,
GetActiveOrders
=
"getActiveOrders"
,
GetSecrets
=
"getSecrets"
,
}
Previous
Auction suffix
Next
Introduction
© 2025 1inch Limited
Privacy Policy
Terms of Service
Commercial API Terms of Use



---


# 7. Error Handling & Expiry


---


# 8. API & Pseudocode Examples


---


# 9. Additional Notes


---
