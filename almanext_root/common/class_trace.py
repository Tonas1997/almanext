class TraceClass:

      ra = 0
      dec = 0
      fov = 0

      def __init__(self, ra, dec, fov):
          self.ra = ra
          self.dec = dec
          self.fov = fov

      def __str__(self):
          return "T: " + str(self.ra) + ", " + str(self.dec) + ", " + str(self.fov)
