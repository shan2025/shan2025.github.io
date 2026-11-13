---
name: Falcon 9 landings
kind: IBM Data Science capstone
order: 4
ran: "A full pipeline predicting whether a SpaceX Falcon 9 first stage lands: launch data from the SpaceX API, cleaning, SQL and visual analysis, a Folium map of launch sites, a Plotly Dash dashboard, and four tuned classifiers (logistic regression, SVM, decision tree, KNN)."
worked: "Logistic regression, SVM and KNN each predicted 83.3% of the held-out test launches correctly. The decision tree looked best in cross-validation at 88.9%, then dropped to 66.7% on the test set, so the validation score alone would have picked the wrong model."
link: https://github.com/shan2025/spacex-falcon9-landing-prediction
linkLabel: See the code
stack: [Python, pandas, NumPy, scikit-learn, SQLite, Matplotlib, Seaborn, Folium, Plotly Dash]
---

## Why it matters

Reusing a rocket's first stage is what makes a launch cheap. If you can predict whether the first stage will land, you can estimate what a launch will cost, which is useful for anyone bidding against SpaceX. This was my capstone for the IBM Applied Data Science programme.

## The pipeline

1. **Collect.** Launch data from the public SpaceX API.
2. **Clean.** Wrangle it into a clean table, with each launch's landing outcome as the label.
3. **Explore.** SQL queries in SQLite, and charts in Matplotlib and Seaborn, to find the launch sites with the best success rates and the payload ranges that go with successful landings.
4. **Map.** A Folium map of the launch sites and their outcomes.
5. **Dashboard.** An interactive Plotly Dash app: pick a launch site and a payload range, and see success rates update.
6. **Predict.** Four classifiers, each tuned with cross-validation: logistic regression, SVM, decision tree and KNN.

## The result that mattered

Logistic regression, SVM and KNN each predicted 83.3% of the held-out test launches correctly. The decision tree had the best cross-validation score, 88.9%, then fell to 66.7% on the test set. Picking a model on its validation score alone would have picked the worst one. It's the same lesson as my wallet risk study: check the result on data the model hasn't seen.
