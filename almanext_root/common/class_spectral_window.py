class SpectralWindowClass:

    start = 0
    end = 0
    resolution = 0
    sensitivity_10kms = 0
    sensitivity_native = 0
    pol_product = 0

    def __init__(self, start, end, resolution, sensitivity_10kms, sensitivity_native, pol_product):
        self.start = start
        self.end = end
        self.resolution = resolution
        self.sensitivity_10kms = sensitivity_10kms
        self.sensitivity_native = sensitivity_native
        self.pol_product = pol_product

    def __str__(self):
        return "W: [" + str(self.start) + ".." + str(self.end) + "GHz]"
