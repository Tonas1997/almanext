class ObservationClass:

    ra = 0
    dec = 0

    spectral_window_list = []
    trace_list = []

    def __init__(self, ra, dec):
        self.ra = ra
        self.dec = dec

    def __str__(self):
        return "O: " + str(self.ra) + ", " + str(self.dec)
