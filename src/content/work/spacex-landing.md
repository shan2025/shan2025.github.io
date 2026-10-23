---
name: Falcon 9 landings
kind: IBM Data Science capstone
order: 4
ran: "A full pipeline predicting whether a SpaceX Falcon 9 first stage lands: launch data from the SpaceX API, cleaning, SQL and visual analysis, a Folium map of launch sites, a Plotly Dash dashboard, and four tuned classifiers (logistic regression, SVM, decision tree, KNN)."
worked: "Logistic regression, SVM and KNN each predicted 83.3% of the held-out test launches correctly. The decision tree looked best in cross-validation at 88.9%, then dropped to 66.7% on the test set, so the validation score alone would have picked the wrong model."
link: https://github.com/shan2025/spacex-falcon9-landing-prediction
linkLabel: See the code
---
