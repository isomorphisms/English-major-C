# R reference invocation, included for reproducibility; not executed in this bundle.
x <- c(0, 1, 2, 3, 4, 5)
y <- c(1, 2, 2, 4, 4, 6)
print(coef(lm(y ~ x)))
