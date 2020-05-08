from django.core.management.base import BaseCommand
from django.db import connection
from common.models import Observation, Trace, SpectralWindow
from common.class_observation import ObservationClass

class Command(BaseCommand):
    args = '<coiso>'

    def _tests(self):
        query_result_obs = Observation.objects.all()
        for curr_obs in query_result_obs:
            curr_spec_windows =  curr_obs.spec_windows.all()
            curr_traces = curr_obs.traces.all()

            # create new (Python) observation, trace and spec_win objects
            obs = ObservationClass(curr_obs.ra, curr_obs.dec)
            trace_list = []
            spec_win_list = []

            # parse traces
            for trace in curr_traces:
                trace_list.append(trace.to_class())

            # parse spectral windows
            for win in curr_spec_windows:
                spec_win_list.append(win.to_class())

            obs.trace_list = trace_list
            obs.spectral_window_list = spec_win_list

            print(obs)
            for trace in obs.trace_list:
                print(trace)

            for win in obs.spectral_window_list:
                print(win)






    def handle(self, *args, **options):
        self._tests()
