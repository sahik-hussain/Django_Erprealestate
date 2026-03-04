from django.http import HttpResponse


def index(request):
    return HttpResponse("TaskList app is ready.")
