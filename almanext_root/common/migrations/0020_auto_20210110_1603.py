# Generated by Django 2.2.10 on 2021-01-10 16:03

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0019_auto_20210110_1601'),
    ]

    operations = [
        migrations.RenameField(
            model_name='emissionline',
            old_name='emission',
            new_name='line',
        ),
    ]
