#include <math.h>
#include <stdio.h>
#include <stdlib.h>

/* This calls the same Fortran entry point used by stats::lm.fit() in R.
   R's high-level lm() function is not called in this standalone harness. */
extern void dqrls_(double *x, int *n, int *p, double *y,
                   int *ny, double *tol, double *b, double *rsd,
                   double *qty, int *k, int *jpvt, double *qraux,
                   double *work);

int main(void) {
    int n = 6, p = 2, ny = 1, k = -1;
    double x[] = {1, 1, 1, 1, 1, 1, 0, 1, 2, 3, 4, 5};
    double y[] = {1, 2, 2, 4, 4, 6};
    double b[] = {0, 0}, rsd[6] = {0}, qty[6] = {0};
    double tol = 1e-7, qraux[2] = {0}, work[4] = {0};
    int jpvt[] = {1, 2};
    dqrls_(x, &n, &p, y, &ny, &tol, b, rsd, qty, &k, jpvt, qraux, work);
    double coefficients[2] = {0, 0};
    for (int i = 0; i < p; i++) coefficients[jpvt[i] - 1] = b[i];
    printf("sample: x=(0,1,2,3,4,5); y=(1,2,2,4,4,6)\n");
    printf("rank=%d\nintercept=%.15g\nslope=%.15g\n", k,
           coefficients[0], coefficients[1]);
    double sum_of_squared_errors = 0.0;
    for (int i = 0; i < n; i++) {
        double error = y[i] - coefficients[0] - coefficients[1] * i;
        sum_of_squared_errors += error * error;
    }
    printf("sum_of_squared_vertical_errors=%.15g\n", sum_of_squared_errors);
    if (k != 2 || fabs(coefficients[0] - 17.0/21.0) > 1e-12 || fabs(coefficients[1] - 33.0/35.0) > 1e-12)
        return 1;
    return 0;
}
