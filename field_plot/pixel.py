class Pixel:
    ra = 0
    dec = 0
    n_obs = 0
    avg_freq = 0
    avg_sensitivity = 0
    # ...

    def set_ra(self, ra):
        self.ra = ra


    def __init__(self, ra, dec)