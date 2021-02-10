class Pixel:

    x = 0
    y = 0

    px_ra = 0
    px_dec = 0

    count_pointings = 0
    avg_res = 0
    avg_sens = 0
    avg_int_time = 0
    cs_sum = 0
    cs_best = 1e9
    
    observations = []

    def __init__(self, x, y, ra, dec):
        self.x = x
        self.y = y
        self.px_ra = ra
        self.px_dec = dec
        self.observations = []

    def change_avgs(self, new_res, new_sens, new_int_time):
        new_avg_res = self.avg_res + (new_res - self.avg_res)/(self.count_pointings+1)
        self.avg_res = new_avg_res

        new_avg_sens = self.avg_sens + (new_sens - self.avg_sens)/(self.count_pointings+1)
        self.avg_sens = new_avg_sens

        new_avg_int_time = self.avg_int_time + (new_int_time - self.avg_int_time)/(self.count_pointings+1)
        self.avg_int_time = new_avg_int_time

        self.count_pointings = self.count_pointings + 1

    def add_cs(self, cs):
        self.cs_sum += cs

    def update_best_cs(self, cs):
        self.cs_best = min(cs, self.cs_best)

    def add_observation(self, obs_index):
        self.observations.append(obs_index)

    def get_observations(self):
        return self.observations

    def has_observation(self, obs_index):
        return(obs_index in self.observations)
