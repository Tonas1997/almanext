import numpy as np

# CREDIT: ISRAEL MATUTE
# The simple form of generic gaussian is:
# def gaussian(x, mu, sig):
#     return np.exp(-np.power(x - mu, 2.) / (2 * np.power(sig, 2.)))

# But to model the ALMA beam we can just use mu = 0, and only changing sigma
# The gaussian model of the ALMA beam can also be expressed in terms of FWHM
# f(x) = a*e^(-4(ln 2)(x-b)^2/FWHM^2)

def gaussian12m(x, freq):
    fwhm = 21.* 300. / freq
    return np.exp(-4*np.log(2)*np.power(x, 2.) / (np.power(fwhm, 2.)))

def gaussian7m(x, freq):
    fwhm = 35.* 300. / freq
    return np.exp(-4*np.log(2)*np.power(x, 2.) / (np.power(fwhm, 2.)))