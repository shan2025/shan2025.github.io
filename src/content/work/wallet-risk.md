---
name: Wallet risk
kind: Machine learning study
order: 3
ran: A classifier for high-risk crypto wallets on a synthetic, heavily imbalanced dataset, in Python and scikit-learn.
worked: The model scored 78% accuracy and caught none of the high-risk wallets. The study reports recall and ROC-AUC instead, because accuracy said it worked when it hadn't.
link: https://github.com/shan2025/crypto-wallet-risk-prediction
linkLabel: See the code
stack: [Python, pandas, scikit-learn, SMOTE]
---

## The question

Can a model flag high-risk cryptocurrency wallets from how they behave? I framed it as an imbalanced classification problem, like fraud detection in banking: very few risky wallets hidden among many normal ones.

## The data

There's no public, labelled dataset of risky wallets, so I generated a synthetic one that behaves like the real thing: transaction volume, how often a wallet deals with exchanges and DeFi protocols, wallet age, and the heavy class imbalance real risk data has.

## What I did

- Explored the data to see how the features differ between risky and normal wallets.
- Split it into training and test sets with the class balance preserved (a stratified split).
- Trained two baselines, logistic regression and a random forest.
- Judged them on precision, recall, F1 and ROC-AUC, not only accuracy.
- Tried two fixes for the imbalance: class weighting and SMOTE, which creates extra synthetic examples of the rare class.

## What I found

Accuracy was the misleading number: one model scored 78% and caught none of the risky wallets. Logistic regression caught more of the risky wallets at the cost of accuracy; the random forest struggled to find them even with class weighting.

## Limits, and what's next

The data is synthetic, and the risk labels are simulated rather than taken from real incidents. The features also miss how wallets behave over time and who they transact with. Next: add time-based and network features, try anomaly detection such as Isolation Forest, and test on real blockchain data.
