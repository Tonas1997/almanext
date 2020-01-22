from astropy import units as u
from astropy.coordinates import SkyCoord, Angle
from views import ra_origin, dec_origin, inc, minF, maxF, obs_array, max_len

# checks whether or not an observation has coverage for the given frequencies
# (values in GHz)
def freqFilter(row):
    if(minF == -1):
        return(True)
    # get spectral windows
    freqs = row["Frequency support"]
    str_windows = freqs.split('U')
    # checks each spectral window individually
    for i in range(len(str_windows)):
        string = (str_windows[i].split(","))[0]
        frequency_array = (string[1: (len(string) - 3)]).split('[')
        freq_range = frequency_array[len(frequency_array)-1]
        vals = freq_range.split("..")
        # this tuple will contain the start and end freqencies of a window
        valNums = [float(vals[0]), float(vals[1])]
        if(len(vals) == 2):
            if((valNums[0] > minF and valNums[0] < maxF) or
               (valNums[1] > minF and valNums[1] < maxF)):
                return(True)
    return(False)
# -------------- LIB --------------

# simple converter, might be discontinued
def arcsecToAngle(arcsec):
    return arcsec / 3600

# fills the pixels around given ra/dec coordinates and a fov measured in arcsecs
def fillPixels(ra, dec, fov):
    # builds an Angle object for convenience
    fov_degree = Angle(fov, unit=u.arcsec)
    # define some support variables and the subgrid
    radius = int(fov_degree.degree / inc)
    center = SkyCoord(ra*u.degree, dec*u.degree, frame='icrs')
    centerX = int(abs(ra - ra_origin) / inc)
    centerY = int(abs(dec - dec_origin) / inc)
    topLeft = [int(max(0, centerX - radius - 1)), int(max(0, centerY - radius - 1))]
    bottomRight = [int(min(max_len - 1, centerX + radius + 1)), int(min(max_len - 1, centerY + radius + 1))]
    # fills the pixels of the subgrid
    for i in range(topLeft[0], bottomRight[0] + 1):
        for j in range(topLeft[1], bottomRight[1] + 1):
            # get the current cell coordinates
            currX = ra_origin + i*inc
            currY = dec_origin - j*inc
            currCoord = SkyCoord(currX*u.degree, currY*u.degree, frame='icrs')
            # see if the current cell falls within the observation fov
            sep = center.separation(currCoord)
            if(sep < fov_degree):
# =============================================================================
#                 this can be easily replaced with any other function - most
#                 likely, it will serialize data to populate a JSON file with
# =============================================================================
                obs_array[i][j] += 1
            # optional code block for visual antialias
            elif((sep - fov_degree) < Angle(square_size/2, unit=u.degree)): 
                obs_array[i][j] += fov_degree/sep